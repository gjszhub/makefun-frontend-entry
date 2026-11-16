// The entry's program (Node 22, standard library only): it hands in the
// frontend. It copies app/ (the static frontend: index.html, ES modules and
// CSS, no build step) and screenshots/ (3 real renders of the running app on
// live make.fun data) from beside this file to /output, and writes
// /output/dossier.json with buildDossier from the vendored make.fun library.
// The scorer rebuilds the dossier with its own copy of that library and
// requires the two to match byte for byte, so vendor/makefun-frontend.ts
// stays exactly as the kit shipped it. The run is deterministic (plain copies
// and a pure function of the files), so the program's two runs write the
// same bytes. package.json at the root marks this repository an ES module,
// so Node runs main.ts without a module-type warning.
//
// Serve the app locally with any static server on app/ (for example
// `python3 -m http.server` inside app/), then open http://localhost:8000.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse (more than 3
// screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 16 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
