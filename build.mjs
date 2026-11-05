import { mkdir, readFile, writeFile, cp, copyFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { Script } from 'node:vm';

const readParts = async (prefix, count) => {
  const parts = await Promise.all(Array.from({ length: count }, (_, i) =>
    readFile(`build-src/${prefix}-${String(i + 1).padStart(2, '0')}.txt`, 'utf8')
  ));
  const encoded = parts.join('').replace(/\s+/g, '');
  if (!encoded || encoded.length % 4 !== 0) throw new Error(`Invalid base64 payload: ${prefix}`);
  return encoded;
};

await mkdir('dist/assets', { recursive: true });
const appB64 = await readParts('app', 8);
const cssB64 = await readParts('styles', 2);
const app = brotliDecompressSync(Buffer.from(appB64, 'base64'));
const { patchApp } = await import('./dripx-patch.mjs');
const appText = await patchApp(app.toString('utf8'));
const css = gunzipSync(Buffer.from(cssB64, 'base64'));
new Script(appText, { filename: 'dist/app.js' });
new Script(await readFile('auth-bootstrap.js', 'utf8'), { filename: 'auth-bootstrap.js' });
new Script(await readFile('dripx-enhancements.js', 'utf8'), { filename: 'dripx-enhancements.js' });
const accountPanel = await readFile('dripx-account-panel.js', 'utf8');
const reviewsPanel = await readFile('dripx-reviews.js', 'utf8');
new Script(accountPanel, { filename: 'dripx-account-panel.js' });
new Script(reviewsPanel, { filename: 'dripx-reviews.js' });
await writeFile('dist/app.js', appText);
const extraCss = await readFile('dripx-enhancements.css');
await writeFile('dist/styles.css', Buffer.concat([css, extraCss]));
await copyFile('index.html', 'dist/index.html');
await copyFile('config.js', 'dist/config.js');
await copyFile('auth-bootstrap.js', 'dist/auth-bootstrap.js');
await copyFile('dripx-enhancements.js', 'dist/dripx-enhancements.js');
await copyFile('dripx-account-panel.js', 'dist/dripx-account-panel.js');
await copyFile('dripx-account-panel.css', 'dist/dripx-account-panel.css');
await copyFile('dripx-visual-system.css', 'dist/dripx-visual-system.css');
await copyFile('dripx-reviews.js', 'dist/dripx-reviews.js');
await cp('assets', 'dist/assets', { recursive: true });
console.log(`DRIP X SHOP build OK · app.js ${appText.length} bytes · CSS ${css.length + extraCss.length} bytes · free products + ZIP reader/staging + SVG icons enabled`);
