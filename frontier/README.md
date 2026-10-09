# COSMOS website recreation

A responsive recreation of `Group 3.png`, built with HTML, CSS, and vanilla JavaScript. It uses the supplied astronaut SVG and all five cloud illustrations. The terrain photograph and alumni portrait are extracted directly from the supplied PDF.

## Preview

Requires Node.js 22 or newer. No packages need to be installed.

```sh
npm run dev
```

Open **http://localhost:5173**. To choose a different address:

```sh
npm run dev -- --host 0.0.0.0 --port 3000
```

You can also open `index.html` directly or serve the files with any static web server.

## Interactions

- Responsive navigation and section links.
- Searchable program explorer with course, internship, workshop, and saved filters.
- Program detail views and a persistent shortlist.
- Explorer profile form with validation and local persistence.
- Accessible dialogs with keyboard navigation, Escape dismissal, and reduced-motion support.
- Informational panels for footer links.

Programs are illustrative. Profile and shortlist data stay in the browser's local storage. This preview does not create online accounts, submit applications, enroll learners, or send messages. The supplied logo and partner placeholder wording are retained to match the reference.

## Check the page

```sh
npm run check
npm test
```

The browser smoke check uses an installed Chrome or Edge browser and saves desktop and mobile screenshots to `.preview/`. Set `CHROME_PATH` if your browser is installed elsewhere.

## Files

- `index.html`: page content and dialog structure.
- `styles.css`: responsive layout and visual styling.
- `app.js`: search, program details, and local profiles.
- `imgs/`: original and extracted artwork.
- `server.mjs`: dependency-free local preview server.

The original reference image and PDF are retained unchanged.
