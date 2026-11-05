import { mkdir, readFile, writeFile, cp, copyFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

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
await writeFile('dist/app.js', appText);
const extraCss = await readFile('dripx-enhancements.css');
await writeFile('dist/styles.css', Buffer.concat([css, extraCss]));
await copyFile('index.html', 'dist/index.html');
await copyFile('config.js', 'dist/config.js');
await copyFile('auth-bootstrap.js', 'dist/auth-bootstrap.js');
await copyFile('dripx-enhancements.js', 'dist/dripx-enhancements.js');
await cp('assets', 'dist/assets', { recursive: true });
console.log(`DRIP X SHOP build OK · app.js ${appText.length} bytes · CSS ${css.length + extraCss.length} bytes · free products + ZIP reader/staging + SVG icons enabled`);
