import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

function isInsideRoot(path) {
  const fromRoot = relative(projectRoot, path);
  return fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot);
}

export function createPreviewServer() {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const finish = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : message);
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      return finish(405, 'Method not allowed');
    }

    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const segments = pathname.replaceAll('\\', '/').split('/').filter(Boolean);
      if (pathname.includes('\0') || segments.some((segment) => segment.startsWith('.'))) {
        return finish(403, 'Forbidden');
      }
      let filePath = resolve(projectRoot, `.${pathname}`);
      if (!isInsideRoot(filePath)) return finish(403, 'Forbidden');
      let fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = resolve(filePath, 'index.html');
        fileStat = await stat(filePath);
      }
      const canonicalPath = await realpath(filePath);
      if (!isInsideRoot(canonicalPath) || !fileStat.isFile()) return finish(403, 'Forbidden');
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': fileStat.size,
      });
      if (request.method === 'HEAD') return response.end();
      const stream = createReadStream(canonicalPath);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error instanceof URIError || error.code === 'ERR_INVALID_URL') return finish(400, 'Bad request');
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return finish(404, 'Not found');
      finish(500, 'Unable to serve this file');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 5173);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--host') host = args[index + 1]?.startsWith('--') || !args[index + 1] ? '0.0.0.0' : args[++index];
    else if (argument.startsWith('--host=')) host = argument.slice(7);
    else if (argument === '--port') port = Number(args[++index]);
    else if (argument.startsWith('--port=')) port = Number(argument.slice(7));
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer between 0 and 65535.');
  const server = createPreviewServer();
  server.on('error', (error) => {
    console.error(`Preview failed: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`COSMOS preview: http://${host === '0.0.0.0' ? 'localhost' : host}:${address.port}`);
  });
}
