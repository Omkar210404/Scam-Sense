import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The built page may only talk to its own origin. This is what backs the promise that a message
// never leaves the phone: even a bug could not send it to another server. Build only, because the
// dev server needs inline scripts for hot reload.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// Writes dist/sw.js from src/sw.js with the exact list of built files to cache for offline use.
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = ['./', ...Object.keys(bundle), ...readdirSync('public')].filter((f) => !f.endsWith('.map'));
    const hash = createHash('sha256').update(files.join('|'));
    for (const out of Object.values(bundle)) hash.update(out.type === 'chunk' ? out.code : out.source);
    const version = hash.digest('hex').slice(0, 10);
    const source = readFileSync('src/sw.js', 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  },
});

export default defineConfig({
  // Relative paths, so the build works from a sub-folder such as GitHub Pages /scamsense/.
  base: './',
  plugins: [react(), csp(), serviceWorker()],
  json: { stringify: true },
  // The bundle is ~570 kB because the model (~280 kB of JSON) ships inside it; that is intended.
  build: { chunkSizeWarningLimit: 800 },
});
