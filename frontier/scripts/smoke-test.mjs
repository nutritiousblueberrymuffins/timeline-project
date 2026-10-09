import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from '../server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(root, '.preview');
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.errors = [];
    socket.addEventListener('message', ({ data }) => {
      if (process.env.DEBUG_CDP) console.log('CDP receive:', String(data).slice(0, 800));
      const message = JSON.parse(data);
      if (message.id) {
        const operation = this.pending.get(message.id);
        if (!operation) return;
        clearTimeout(operation.timeout);
        this.pending.delete(message.id);
        if (message.error) operation.reject(new Error(message.error.message));
        else operation.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.errors.push(message.params.args.map((argument) => argument.value || argument.description).join(' '));
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveConnection, reject) => {
      socket.addEventListener('open', resolveConnection, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new DevTools(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolveCommand, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools timed out: ${method}`));
      }, 20_000);
      this.pending.set(id, { resolve: resolveCommand, reject, timeout });
      if (process.env.DEBUG_CDP) console.log('CDP send:', method);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }

  close() {
    for (const operation of this.pending.values()) clearTimeout(operation.timeout);
    this.socket.close();
  }
}

let server;
let chrome;
let devtools;
let profileDirectory;

try {
  await access(chromePath);
  await mkdir(outputDirectory, { recursive: true });
  profileDirectory = await mkdtemp(resolve(tmpdir(), 'cosmos-browser-'));
  server = createPreviewServer();
  await new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  const url = `http://127.0.0.1:${server.address().port}/`;
  const pageResponse = await fetch(url);
  assert.equal(pageResponse.status, 200, 'The preview should serve index.html');
  assert.match(pageResponse.headers.get('content-type'), /text\/html/, 'The preview should serve HTML with its MIME type');
  assert.equal((await fetch(`${url}.git/config`)).status, 403, 'Private dotfiles should not be served');

  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`, 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const debuggerUrl = await new Promise((resolveBrowser, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start its debugger. ${stderr.slice(-1000)}`)), 20_000);
    chrome.once('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome exited with code ${code}. ${stderr.slice(-1000)}`)); });
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolveBrowser(match[1]); }
    });
  });
  const debugOrigin = debuggerUrl.replace(/^ws:/, 'http:').split('/devtools/')[0];
  const targets = await (await fetch(`${debugOrigin}/json/list`)).json();
  const pageTarget = targets.find((target) => target.type === 'page');
  assert.ok(pageTarget, 'Chrome should provide a page target');
  devtools = await DevTools.connect(pageTarget.webSocketDebuggerUrl);
  await devtools.send('Page.enable');
  await devtools.send('Runtime.enable');
  await devtools.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000, mobile: false }, { name: 'mobile', width: 390, height: 844, mobile: true }]) {
    await devtools.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    await devtools.send('Page.navigate', { url });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await devtools.evaluate('document.readyState === "complete" && !!document.querySelector("main")')) break;
      if (attempt === 99) throw new Error('The page did not finish loading.');
      await delay(100);
    }
    await devtools.evaluate(`(async () => {
      await document.fonts.ready;
      for (const image of document.images) image.loading = 'eager';
      await Promise.all(Array.from(document.images, image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })));
      window.scrollTo(0, 0);
      return true;
    })()`);
    await delay(250);
    const layout = await devtools.evaluate(`({
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      missingImages: Array.from(document.images).filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
      heading: document.querySelector('h1')?.textContent.trim(),
      height: document.documentElement.scrollHeight
    })`);
    assert.ok(layout.heading, 'The page should have its main heading');
    assert.ok(layout.documentWidth <= layout.width + 1, `${viewport.name} should not overflow horizontally: ${JSON.stringify(layout)}`);
    assert.deepEqual(layout.missingImages, [], `${viewport.name} should load all image assets`);
    const screenshot = await devtools.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: viewport.width, height: layout.height, scale: 1 },
    });
    await writeFile(resolve(outputDirectory, `${viewport.name}.png`), Buffer.from(screenshot.data, 'base64'));
    console.log(`PASS ${viewport.name}: ${viewport.width}px wide, ${layout.height}px tall, images loaded, no horizontal overflow.`);
  }

  const navigation = await devtools.evaluate(`(() => {
    const links = Array.from(document.querySelectorAll('a[href^="#"]')).filter(link => link.hash.length > 1);
    const invalid = links.filter(link => !document.getElementById(decodeURIComponent(link.hash.slice(1)))).map(link => link.getAttribute('href'));
    const link = links.find(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
    if (link) link.click();
    return { count: links.length, invalid, expectedHash: link?.hash, actualHash: location.hash };
  })()`);
  assert.ok(navigation.count > 0, 'The page should have working section navigation');
  assert.deepEqual(navigation.invalid, [], 'Every section link should target an existing section');
  assert.equal(navigation.actualHash, navigation.expectedHash, 'Clicking a section link should navigate to its target');
  console.log(`PASS navigation: ${navigation.count} section links point to valid destinations.`);

  const mobileNavigation = await devtools.evaluate(`(() => {
    const toggle = document.querySelector('.menu-toggle');
    toggle.click();
    const opened = toggle.getAttribute('aria-expanded') === 'true' && document.querySelector('#primary-nav').getBoundingClientRect().height > 0;
    document.querySelector('#primary-nav a[href="#explore"]').click();
    return { opened, closedAfterNavigation: toggle.getAttribute('aria-expanded') === 'false', hash: location.hash };
  })()`);
  assert.ok(mobileNavigation.opened, 'The mobile menu should expand');
  assert.ok(mobileNavigation.closedAfterNavigation, 'The mobile menu should close after selecting a section');
  assert.equal(mobileNavigation.hash, '#explore');
  await devtools.evaluate(`document.querySelector('.menu-toggle').click(); document.querySelector('#primary-nav button').focus(); true`);
  await devtools.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await devtools.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const menuEscape = await devtools.evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector('.menu-toggle')`);
  assert.ok(menuEscape, 'Escape should close mobile navigation and restore focus to its toggle');
  console.log('PASS mobile navigation: menu opens and closes after section navigation.');

  const modalResult = await devtools.evaluate(`(() => {
    const trigger = document.querySelector('[data-account="signup"], [data-open-modal], [data-modal], [data-dialog], [data-action="signup"]') || Array.from(document.querySelectorAll('button')).find(button => /sign up|join the mission/i.test(button.textContent));
    if (!trigger) return { trigger: false };
    trigger.click();
    const dialog = Array.from(document.querySelectorAll('dialog, [role="dialog"]')).find(element => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden' && element.getAttribute('aria-hidden') !== 'true');
    return { trigger: true, open: !!dialog, role: dialog?.tagName };
  })()`);
  assert.ok(modalResult.trigger, 'The signup flow should have an action button');
  assert.ok(modalResult.open, 'The signup action should open a dialog');
  await devtools.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await devtools.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await delay(100);
  const modalClosed = await devtools.evaluate(`!Array.from(document.querySelectorAll('dialog, [role="dialog"]')).some(element => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden' && element.getAttribute('aria-hidden') !== 'true')`);
  assert.ok(modalClosed, 'Escape should dismiss the dialog');
  console.log('PASS dialog: signup opens and Escape dismisses it.');

  const catalog = await devtools.evaluate(`(() => {
    document.querySelector('[data-explore="all"]').click();
    const opened = document.querySelector('#explore-dialog').open;
    const initialCount = document.querySelectorAll('[data-program]').length;
    const search = document.querySelector('#program-search');
    search.value = 'climate';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const filteredCount = document.querySelectorAll('[data-program]').length;
    const first = document.querySelector('[data-program]');
    const selectedId = first?.dataset.program;
    first?.click();
    const detailsOpened = document.querySelector('#info-dialog').open;
    document.querySelector('[data-save]')?.focus();
    document.querySelector('[data-save]')?.click();
    const saveRetainsFocus = document.activeElement === document.querySelector('[data-save]');
    const savedIds = JSON.parse(localStorage.getItem('cosmos-saved') || '[]');
    document.querySelector('#info-dialog [data-close]').click();
    document.querySelector('[data-explore="all"]').click();
    document.querySelector('[data-filter="saved"]').click();
    const shortlist = Array.from(document.querySelectorAll('[data-program]'), element => element.dataset.program);
    document.querySelector('#explore-dialog [data-close]').click();
    return { opened, initialCount, filteredCount, selectedId, detailsOpened, savedIds, shortlist, saveRetainsFocus };
  })()`);
  assert.ok(catalog.opened, 'Search should open the program explorer');
  assert.equal(catalog.initialCount, 6, 'The explorer should show all six programs initially');
  assert.ok(catalog.filteredCount > 0 && catalog.filteredCount < catalog.initialCount, 'Searching climate should narrow the available programs');
  assert.ok(catalog.detailsOpened, 'Selecting a program should open its details');
  assert.ok(catalog.savedIds.includes(catalog.selectedId), 'Saving a program should write it to local storage');
  assert.ok(catalog.saveRetainsFocus, 'Saving a program should preserve keyboard focus on the save button');
  assert.deepEqual(catalog.shortlist, [catalog.selectedId], 'The Saved filter should show the saved program');
  console.log(`PASS explorer: search narrows ${catalog.initialCount} programs to ${catalog.filteredCount}; details and saved shortlist work.`);

  const signup = await devtools.evaluate(`(() => {
    document.querySelector('[data-account="signup"]').click();
    document.querySelector('#explorer-name').value = 'Test Explorer';
    document.querySelector('#explorer-email').value = 'test.explorer@example.com';
    document.querySelector('#explorer-interest').value = 'Earth & climate';
    document.querySelector('#account-form').requestSubmit();
    return {
      complete: !document.querySelector('#profile-success').hidden,
      formHidden: document.querySelector('#account-form').hidden,
      profile: JSON.parse(localStorage.getItem('cosmos-profile') || 'null')
    };
  })()`);
  assert.ok(signup.complete && signup.formHidden, 'Submitting a valid explorer profile should show the success state');
  assert.equal(signup.profile?.name, 'Test Explorer');
  assert.equal(signup.profile?.email, 'test.explorer@example.com');
  assert.equal(signup.profile?.interest, 'Earth & climate');

  await devtools.send('Page.reload');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await devtools.evaluate('document.readyState === "complete" && document.querySelector(\'#primary-nav [data-account="login"]\')?.textContent === "My Profile"')) break;
    if (attempt === 99) throw new Error('The saved profile did not return after reloading.');
    await delay(100);
  }
  const persisted = await devtools.evaluate(`(() => {
    document.querySelector('[data-explore="all"]').click();
    document.querySelector('[data-filter="saved"]').click();
    const shortlist = Array.from(document.querySelectorAll('[data-program]'), element => element.dataset.program);
    document.querySelector('#explore-dialog [data-close]').click();
    document.querySelector('[data-account="login"]').click();
    return { shortlist, profileVisible: !document.querySelector('#profile-success').hidden };
  })()`);
  assert.deepEqual(persisted.shortlist, [catalog.selectedId], 'The saved program should survive a page reload');
  assert.ok(persisted.profileVisible, 'The explorer profile should survive a page reload');
  console.log('PASS profile: valid signup succeeds; profile and saved programs persist after reload.');
  assert.deepEqual(devtools.errors, [], 'The browser should not report JavaScript runtime errors');
  console.log('PASS runtime: no JavaScript errors.');
  console.log(`Screenshots saved to ${outputDirectory}`);
} catch (error) {
  console.error(`FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (devtools) devtools.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill();
    await Promise.race([new Promise((resolveExit) => chrome.once('exit', resolveExit)), delay(2000)]);
  }
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  if (profileDirectory && dirname(resolve(profileDirectory)) === resolve(tmpdir()) && basename(profileDirectory).startsWith('cosmos-browser-')) {
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => { });
  }
}
