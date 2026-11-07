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
const authBootstrap = await readFile('auth-bootstrap.js', 'utf8');
const uploadValidator = await readFile('supabase/functions/dripx-validate-product-upload/index.ts', 'utf8');
const downloadFunction = await readFile('supabase/functions/dripx-license/index.ts', 'utf8');
const profileMigration = await readFile('supabase/migrations/20261106203640_secure_dripx_profile_column_permissions.sql', 'utf8');
const privacyMigration = await readFile('supabase/migrations/20261106210000_dripx_public_top_buyers_respect_opt_in.sql', 'utf8');
const categoryMigration = await readFile('supabase/migrations/20261106224000_dripx_category_integrity.sql', 'utf8');
const uploadChecks = [
  [appText.includes('dripx_server_license.lua') && appText.includes('DRIPX_LICENSE_KEY_PLACEHOLDER'), 'dedicated server-only license guard is generated'],
  [appText.includes('__DRIPX_PROCESSED_PRODUCT_FILE=file') && appText.includes('new File([blob],name,{type:\'application/zip\''), 'direct processed ZIP File handoff without URL capture'],
  [uploadUi.includes('download.click()') && !uploadUi.includes('armCompiledZipCapture') && !uploadUi.includes('new DataTransfer()'), 'product UI no longer intercepts URL.createObjectURL for ZIP capture'],
  [uploadValidator.includes('server_license_guard_missing') && uploadValidator.includes('DRIPX_LICENSE_EVENT_NAME'), 'server upload validator enforces private guard and public shared bridge'],
  [appText.includes("const aclRights=['function.fetchRemote','function.stopResource']") && appText.includes('aclrequest'), 'generated MTA resource requests only the required license ACL rights'],
  [appText.includes('if not DRIPX_LICENSE_EVENT_REGISTERED then addEvent') && !appText.includes('DRIPX_CLIENT_LICENSE_EVENT_REGISTERED'), 'shared and client scripts register the license event idempotently'],
  [appText.includes("const guardName='dripx_server_license.lua'") && appText.includes('DRIPX_LICENSE_KEY_PLACEHOLDER'), 'active product pipeline creates a server-only license template for buyer-time compilation'],
  [downloadFunction.includes('compileMtaLicenseGuard') && downloadFunction.includes('license_guard_compilation_failed') && downloadFunction.includes('zip.remove(guardPath)'), 'buyer download compiles personalized server guard and rewrites meta.xml'],
  [appText.includes('Descargas ZIP deben pasar por dripx-license/download') && uploadUi.includes('/functions/v1/dripx-license/download'), 'legacy signed-URL ZIP delivery is blocked in favor of personalized server download'],
  [appText.includes('b.compiledFiles=[...completed]'), 'resumable per-file compilation'],
  [uploadUi.includes('Number(file?.size)>50_000_000') && zipReader.includes('compressed:50*1000*1000') && uploadValidator.includes('source.length > 50_000_000') && downloadFunction.includes('sourceZip.byteLength > 50_000_000'), 'Supabase Free ZIP size cap aligned across browser, server validation and downloads'],
  [appText.includes('db.auth.refreshSession()'), 'session refresh before compilation'],
  [appText.includes('async function resumeZip()'), 'ZIP resume action'],
  [appText.includes('b.finalBlobSize=file.size'), 'final processed File identity check'],
  [appText.includes('El borrador se conservó'), 'draft preservation after upload errors'],
  [!patchSource.includes("dripx_products').delete().eq('id',product.id)"), 'no destructive draft cleanup'],
  [patchSource.includes("featured:fd.has('featured'),is_featured:fd.has('featured')"), 'product insert preserves both featured columns in live dripx_products schema'],
  [patchSource.includes("fd.set('file',stagedZip,stagedZip.name)") && patchSource.includes("file!==staged"), 'protected ZIP is the exact file sent in FormData'],
  [patchSource.includes("setSaveState('03/4") && patchSource.includes("setSaveState('04/4") && patchSource.toLowerCase().includes("verificando crc, meta.xml y bytecode mta"), 'visible product-save transaction stages'],
  [appText.includes('window.__DRIPX_PROCESSED_PRODUCT_FILE=file') && !uploadUi.includes('new DataTransfer()'), 'mobile-safe direct processed File staging without input mutation'],
  [uploadUi.includes("original=input?.files?.[0]") && uploadUi.includes('processed.productId!==window.__DRIPX_PENDING_PRODUCT_ID'), 'submit guard validates original input and staged output'],
  [authBootstrap.includes('sharedSupabaseClient=client') && authBootstrap.includes('return sharedSupabaseClient;'), 'single authenticated Supabase client across app panels'],
  [zipReader.includes("return /\\.lua$/i.test(entry.name)&&(type==='server'||type==='client'||type==='shared');") && !zipReader.includes("record?.kind!=='config'"), 'compile every executable Lua declaration consistently'],
  [zipReader.includes("scriptType==='shared'?'shared_lua'"), 'meta.xml-declared shared Lua classification'],
  [zipReader.includes("type==='server'||type==='client'||type==='shared'") && zipReader.includes("'dripx_shared_license.lua'"), 'shared Lua scripts are compiled and the public bridge name is reserved'],
  [patchSource.includes('DRIPX_SHARED_LICENSE_GATED_PAYLOAD') && patchSource.includes("working.file('dripx_shared_license.lua',sharedBridge)"), 'original shared code is gated and the separate public bridge is generated'],
  [patchSource.includes('const sharedScriptTags=originalScriptTags.filter') && patchSource.includes('const otherScriptTags=originalScriptTags.filter'), 'shared scripts are ordered before server/client startup'],
  [patchSource.includes('ya está compilado o no es Lua') && zipReader.includes('compiledShared'), 'precompiled shared inputs are rejected and original shared bytecode is verified'],
  [uploadValidator.includes('uncompiled_shared_lua_present') && uploadValidator.includes('shared_license_bridge_missing'), 'upload validator rejects uncompiled shared Lua and requires the bridge'],
  [downloadFunction.includes('resource_uncompiled_shared_lua_present') && downloadFunction.includes('resource_shared_license_bridge_missing'), 'buyer download rejects uncompiled shared Lua and requires the bridge'],
  [zipReader.includes("ensureZipUiNode('zip-analysis','div')") && zipReader.includes('analysisNode.innerHTML'), 'ZIP UI nodes guarded before rendering'],
  [zipReader.includes('dripxZipCRC32(data)') && zipReader.includes('LIMITS.expanded'), 'ZIP CRC and expansion limits'],
  [zipReader.includes("archiveNames=entries.map(entry=>entry.name)") && !zipReader.includes("archiveNames=files.map("), 'ZIP platform detection without temporal-dead-zone access'],
  [zipReader.includes("type==='shared'") && zipReader.includes('infoType!==\'script\''), 'MTA metadata and license shared-script integrity'],
  [zipReader.includes('resource FiveM'), 'FiveM archive rejection with explicit guidance'],
  [uploadValidator.includes('meta_info_incomplete') && uploadValidator.includes('meta_script_type_invalid'), 'server-side MTA metadata validation'],
  [downloadFunction.includes('resource_meta_info_incomplete') && downloadFunction.includes('startsAt <= now'), 'download metadata and plan start-time validation'],
  [profileMigration.includes('grant update (leaderboard_public, updated_at)'), 'profile privilege allowlist migration'],
  [privacyMigration.includes('leaderboard_public is true'), 'public leaderboard respects privacy opt-in'],
  [uploadUi.includes('Reanudar proceso'), 'visible retry control'],
  [uploadUi.includes('installDescriptionToolbar'), 'description icon toolbar'],
  [uploadCss.includes('.dx-zip-retry') && uploadCss.includes('.dx-description-tools'), 'professional upload/editor styling'],
  [uploadUi.includes('function categoryViewActive()') && uploadUi.includes('async function renderCategoryManager(force=false)') && uploadUi.includes('data-dx-category-action="delete"'), 'complete admin category manager with CRUD controls'],
  [uploadUi.includes('const source=activeNames;') && uploadUi.includes('categorySyncAt=0'), 'new product selector uses active categories and refreshes after changes'],
  [patchSource.includes("categoryRecord=await call(db.from('dripx_categories')") && patchSource.includes('category:categoryName,'), 'new products must reference an active Supabase category'],
  [categoryMigration.includes('dripx_guard_category_references') && categoryMigration.includes('No se puede eliminar esta categoría'), 'database category rename/delete safeguards'],
  [uploadUi.includes('function isAdminNavigationControl(control)') && uploadUi.includes('!isAdminNavigationControl(control)'), 'category panel only reacts to real admin navigation controls'],
  [uploadUi.includes('if(categoryManagerTimer&&!force)return;') && uploadUi.includes('categoryManagerTimer=0;'), 'category panel render scheduler cannot be starved by repeated DOM mutations'],
  [uploadUi.includes('function installCategoryAuthLifecycle()') && uploadUi.includes("event==='SIGNED_OUT'"), 'category panel session lifecycle only clears on real sign-out/user change'],
  [uploadUi.includes('window.__DRIPX_ADMIN_SESSION_VERIFIED=true') && uploadUi.includes('window.__DRIPX_ADMIN_VERIFIED_USER_ID=String(session.user.id)'), 'category panel keeps verified admin state across transient UI refreshes'],
  [!uploadUi.includes('if(!categoryViewActive()||!client||window.DRIPX_IS_ADMIN!==true)'), 'category panel is not removed by temporary DRIPX_IS_ADMIN UI flag changes'],
  [uploadUi.includes("panel=categoryPanel();\n      if(!panel)throw new Error('La vista administrativa se actualizó"), 'category panel reattaches to the live app after asynchronous category queries'],
  [uploadUi.includes("window.sessionStorage?.setItem('dripx.admin.tab','categorias')") && uploadUi.includes('function syncCategoryRouteFromHash(){'), 'category tab selection survives internal rerenders and browser refreshes'],
  [uploadUi.includes('currentPanel?.dataset.loaded===\'error\'') && uploadUi.includes('if(categoryManagerTimer&&!force)return;'), 'category errors do not trigger mutation-observer retry loops']
];
const categoryRouteStart = uploadUi.indexOf('function syncCategoryRouteFromHash(){');
const categoryRouteEnd = uploadUi.indexOf('\n  document.addEventListener', categoryRouteStart);
if (categoryRouteStart < 0 || categoryRouteEnd < 0) throw new Error('DRIPX category route regression test could not locate the route handler.');
const categoryRouteSource = uploadUi.slice(categoryRouteStart, categoryRouteEnd);
const categoryChecks = [
  [categoryRouteSource.includes("else if(!/^#admin\\/?$/.test(hash))"), 'category selection survives normalization to the base admin route'],
  [categoryRouteSource.includes('categories?'), 'category routing supports Spanish and English route names'],
  [uploadUi.includes('if(/Solo administración/i.test(message))'), 'category authorization denial is separated from session failures'],
  [!uploadUi.includes('/Solo administración|sesión expiró|inicia sesión|administrativa no está disponible/i.test(message)'), 'transient session errors keep the category panel and retry action visible']
];
const failedCategoryChecks = categoryChecks.filter(([passed]) => !passed).map(([,name]) => name);
if (failedCategoryChecks.length) throw new Error('DRIPX category regression checks failed: ' + failedCategoryChecks.join(', '));
const failedUploadChecks = uploadChecks.filter(([passed]) => !passed).map(([,name]) => name);
if (failedUploadChecks.length) throw new Error('DRIPX upload pipeline checks failed: ' + failedUploadChecks.join(', '));
const cssSource = Buffer.concat([css, extraCss]).toString('utf8') + await readFile('dist/dripx-visual-system.css', 'utf8');
if (!cssSource.includes('@media(max-width:720px)') || !cssSource.includes(':focus-visible')) {
  throw new Error('DRIPX responsive/accessibility styles are missing.');
}
console.log(`DRIP X SHOP build OK · static asset, client-secret, feature, responsive and accessibility smoke checks passed · app.js ${appText.length} bytes · CSS ${css.length + extraCss.length} bytes · free products + ZIP reader/staging + SVG icons enabled`);
