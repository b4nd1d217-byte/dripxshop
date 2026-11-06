import { mkdir, readFile, writeFile, cp, copyFile, access } from 'node:fs/promises';
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
const shell = await readFile('dist/index.html', 'utf8');
const localRefs = [...shell.matchAll(/(?:src|href)="(\/[^"?#]+)(?:\?[^"]*)?"/g)].map(match => match[1]);
for (const ref of localRefs) {
  try { await access('dist' + ref); }
  catch { throw new Error(`Missing local asset referenced by index.html: ${ref}`); }
}
const clientFiles = ['dist/config.js','dist/app.js','dist/auth-bootstrap.js','dist/dripx-enhancements.js','dist/dripx-account-panel.js','dist/dripx-reviews.js'];
const clientSource = (await Promise.all(clientFiles.map(path => readFile(path, 'utf8')))).join('\n');
if (/sb_secret_[A-Za-z0-9_-]{20,}/i.test(clientSource) || /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20,}/i.test(clientSource)) {
  throw new Error('A server-side Supabase secret was detected in a public client asset.');
}
const requiredFeatures = [
  'dripx_claim_free_product',
  'dripx-validate-product-upload',
  'DRIPX_UPLOAD_FILE',
  'dripx-license/download',
  'dripx-discord-logs',
  'customer_get_or_issue_account_license',
  'dripx_reviews'
];
const missingFeatures = requiredFeatures.filter(feature => !clientSource.includes(feature));
if (missingFeatures.length) throw new Error('DRIPX smoke checks failed; missing features: ' + missingFeatures.join(', '));
const patchSource = await readFile('dripx-patch.mjs', 'utf8');
const zipReader = await readFile('dripx-zip-reader.txt', 'utf8');
const uploadUi = await readFile('dripx-enhancements.js', 'utf8');
const uploadCss = await readFile('dripx-enhancements.css', 'utf8');
const uploadChecks = [
  [appText.includes('b.compiledFiles=[...completed]'), 'resumable per-file compilation'],
  [appText.includes('db.auth.refreshSession()'), 'session refresh before compilation'],
  [appText.includes('async function resumeZip()'), 'ZIP resume action'],
  [appText.includes('b.finalBlobSize=blob.size'), 'final archive identity check'],
  [appText.includes('El borrador se conservó'), 'draft preservation after upload errors'],
  [!patchSource.includes("dripx_products').delete().eq('id',product.id)"), 'no destructive draft cleanup'],
  [zipReader.includes("(type==='server'||type==='client')&&record?.kind!=='config'"), 'compile only declared executable Lua'],
  [uploadUi.includes('Reanudar proceso'), 'visible retry control'],
  [uploadUi.includes('installDescriptionToolbar'), 'description icon toolbar'],
  [uploadCss.includes('.dx-zip-retry') && uploadCss.includes('.dx-description-tools'), 'professional upload/editor styling']
];
const failedUploadChecks = uploadChecks.filter(([passed]) => !passed).map(([,name]) => name);
if (failedUploadChecks.length) throw new Error('DRIPX upload pipeline checks failed: ' + failedUploadChecks.join(', '));
const cssSource = Buffer.concat([css, extraCss]).toString('utf8') + await readFile('dist/dripx-visual-system.css', 'utf8');
if (!cssSource.includes('@media(max-width:720px)') || !cssSource.includes(':focus-visible')) {
  throw new Error('DRIPX responsive/accessibility styles are missing.');
}
console.log(`DRIP X SHOP build OK · static asset, client-secret, feature, responsive and accessibility smoke checks passed · app.js ${appText.length} bytes · CSS ${css.length + extraCss.length} bytes · free products + ZIP reader/staging + SVG icons enabled`);
