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
const catalogManager = await readFile('dripx-catalog-manager.js', 'utf8');
new Script(catalogManager, { filename: 'dripx-catalog-manager.js' });
const accountPanel = await readFile('dripx-account-panel.js', 'utf8');
const reviewsPanel = await readFile('dripx-reviews.js', 'utf8');
new Script(accountPanel, { filename: 'dripx-account-panel.js' });
new Script(reviewsPanel, { filename: 'dripx-reviews.js' });
const userAdminPanel = await readFile('dripx-user-admin.js', 'utf8');
new Script(userAdminPanel, { filename: 'dripx-user-admin.js' });
await writeFile('dist/app.js', appText);
const extraCss = await readFile('dripx-enhancements.css');
await writeFile('dist/styles.css', Buffer.concat([css, extraCss]));
await copyFile('index.html', 'dist/index.html');
await copyFile('config.js', 'dist/config.js');
await copyFile('auth-bootstrap.js', 'dist/auth-bootstrap.js');
await copyFile('dripx-enhancements.js', 'dist/dripx-enhancements.js');
await copyFile('dripx-catalog-manager.js', 'dist/dripx-catalog-manager.js');
await copyFile('dripx-catalog-manager.css', 'dist/dripx-catalog-manager.css');
await copyFile('dripx-account-panel.js', 'dist/dripx-account-panel.js');
await copyFile('dripx-account-panel.css', 'dist/dripx-account-panel.css');
await copyFile('dripx-visual-system.css', 'dist/dripx-visual-system.css');
await copyFile('dripx-reviews.js', 'dist/dripx-reviews.js');
await copyFile('dripx-user-admin.js', 'dist/dripx-user-admin.js');
await copyFile('dripx-user-admin.css', 'dist/dripx-user-admin.css');
await cp('assets', 'dist/assets', { recursive: true });
const shell = await readFile('dist/index.html', 'utf8');
const localRefs = [...shell.matchAll(/(?:src|href)="(\/[^"?#]+)(?:\?[^"]*)?"/g)].map(match => match[1]);
for (const ref of localRefs) {
  try { await access('dist' + ref); }
  catch { throw new Error(`Missing local asset referenced by index.html: ${ref}`); }
}
const clientFiles = ['dist/config.js','dist/app.js','dist/auth-bootstrap.js','dist/dripx-enhancements.js','dist/dripx-catalog-manager.js','dist/dripx-account-panel.js','dist/dripx-reviews.js','dist/dripx-user-admin.js'];
const clientSource = (await Promise.all(clientFiles.map(path => readFile(path, 'utf8')))).join('\n');
if (/sb_secret_[A-Za-z0-9_-]{20,}/i.test(clientSource) || /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20,}/i.test(clientSource)) {
  throw new Error('A server-side Supabase secret was detected in a public client asset.');
}
const requiredFeatures = [
  'dripx_admin_list_users',
  'dripx_admin_set_user_role',
  'dripx_admin_grant_user_product',
  'dripx_admin_revoke_user_product',
  'dripx_admin_set_user_suspension',
  'dripx_admin_get_user_audit',
  'dripx_admin_update_catalog_item',
  'dripx_admin_set_catalog_status',
  'dripx_admin_save_plan_resources',
  'dripx_admin_create_plan',
  'dripx_admin_update_product_details',
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
const catalogUi = await readFile('dripx-catalog-manager.js', 'utf8');
const catalogCss = await readFile('dripx-catalog-manager.css', 'utf8');
const authBootstrap = await readFile('auth-bootstrap.js', 'utf8');
const uploadValidator = await readFile('supabase/functions/dripx-validate-product-upload/index.ts', 'utf8');
const downloadFunction = await readFile('supabase/functions/dripx-license/index.ts', 'utf8');
const profileMigration = await readFile('supabase/migrations/20261106203640_secure_dripx_profile_column_permissions.sql', 'utf8');
const privacyMigration = await readFile('supabase/migrations/20261106210000_dripx_public_top_buyers_respect_opt_in.sql', 'utf8');
const categoryMigration = await readFile('supabase/migrations/20261106224000_dripx_category_integrity.sql', 'utf8');
const productMediaMigration = await readFile('supabase/migrations/20261108224500_dripx_product_media_category_admin.sql', 'utf8');
const serverRebindingMigration = await readFile('supabase/migrations/20261108233000_allow_account_license_server_rebinding.sql', 'utf8');
const uploadChecks = [
  [appText.includes('dripx_server_license.lua') && appText.includes('DRIPX-CFG.LUA') && appText.includes('DRIPX_CFG_LICENSE_KEY') && appText.includes('DRIPX_LICENSE_KEY_PLACEHOLDER'), 'buyer-time DRIPX-CFG.LUA server configuration template is generated'],
  [appText.includes("const configScriptTag='<script src=\"'+configName+'\" type=\"server\" />';") && appText.includes("const orderedScripts=[configScriptTag,guardScriptTag,...sharedScriptTags,...otherScriptTags]"), 'private license config is loaded before the server license guard'],
  [appText.includes('__DRIPX_PROCESSED_PRODUCT_FILE=file') && appText.includes('new File([blob],name,{type:\'application/zip\''), 'direct processed ZIP File handoff without URL capture'],
  [uploadUi.includes('await actions.download()') && !uploadUi.includes('armCompiledZipCapture') && !uploadUi.includes('new DataTransfer()') && !uploadUi.includes('download.click()'), 'product UI stages the exact protected File directly without synthetic clicks or input mutation'],
  [uploadValidator.includes('server_license_guard_missing') && uploadValidator.includes('server_license_config_missing') && uploadValidator.includes('DRIPX_CFG_PRODUCT_ID') && !uploadValidator.includes('shared_license_bridge_missing'), 'server upload validator enforces private cfg, guard and public shared bridge'],
  [uploadValidator.includes('dripx_server_license.luac') && uploadValidator.includes('server_license_guard_bytecode_invalid') && uploadValidator.includes('server_license_config_load_order_invalid'), 'upload validator requires editable config and MTA-bytecode guard in load order'],
  [zipReader.includes('window.DRIPX_INSPECT_ZIP') && zipReader.includes('META_XML_MISSING') && zipReader.includes('SHADER_FILES_MISSING') && zipReader.includes('does not invent or inject meta.xml'), 'independent inspector inventories valid ZIPs without requiring or injecting MTA metadata'],
  [zipReader.includes('hasMtaMeta') && zipReader.includes('hasMtaApi') && zipReader.includes("runtimeTarget:'MTA:SA'") && !zipReader.includes('fivem|fxserver/i.test(infoText)'), 'MTA manifests and native APIs override FiveM-style labels and filenames'],
  [downloadFunction.includes('serverLicenseGuards') && downloadFunction.includes('dripx_server_license.luac') && downloadFunction.includes('new Response(sourceZip') && downloadFunction.includes('generic-v1'), 'protected buyers receive the same stored generic ZIP without per-buyer compilation'],
  [!downloadFunction.includes('compileMtaLicenseGuard') && !downloadFunction.includes('personalizedConfig') && !downloadFunction.includes('licenseKey'), 'download path never reads or injects a buyer-specific key and never calls the compiler'],
  [downloadFunction.includes('DRIPX_LICENSE_KEY_PLACEHOLDER') && downloadFunction.includes('DRIPX_CFG_PRODUCT_ID') && downloadFunction.includes('resource_server_license_config_load_order_invalid') && !downloadFunction.includes('personalizedConfig') && !downloadFunction.includes('compileMtaLicenseGuard'), 'generic ZIP keeps the editable placeholder config and download never inserts a buyer key'],
  [appText.includes("const aclRights=['function.fetchRemote','function.stopResource']") && appText.includes('aclrequest'), 'generated MTA resource requests only the required license ACL rights'],
  [appText.includes('if not DRIPX_CLIENT_LICENSE_EVENT_REGISTERED then addEvent') && appText.includes('addEvent("dripx:license:ready",false)'), 'shared and client scripts register the license event idempotently'],
  [appText.includes("const guardName='dripx_server_license.lua'") && appText.includes('DRIPX_LICENSE_KEY_PLACEHOLDER') && patchSource.includes('b.compileTargets=[...(b.compileTargets||[]).filter(target=>target?.name!==guardName),{name:guardName}]') && patchSource.includes('b.scriptSrcByFile.set(guardName,guardName)'), 'generic server guard is included in the one-time Trabajar compilation'],
  [patchSource.includes('precompiledScripts') && patchSource.includes('if(precompiledScripts.length)') && patchSource.includes('Sube los Lua fuente (.lua)'), 'protect workflow rejects precompiled source resources that cannot be license-gated'],
  [uploadValidator.includes('dripx_server_license.luac') && uploadValidator.includes('server_license_guard_bytecode_invalid') && uploadValidator.includes('configTagIndex>=guardScriptIndex'), 'upload validator requires compiled generic guard after editable config'],
  [appText.includes('window.DRIPX_DOWNLOAD_OWNED_PRODUCT') && uploadUi.includes('/functions/v1/dripx-license/download') && downloadFunction.includes('product.protection_enabled !== true'), 'all buyer ZIP downloads use the authorized Edge Function for raw or personalized ZIPs'],
  [appText.includes('b.compiledFiles=[...completed]') && uploadUi.includes('const expectedCompiled=scan+1') && uploadUi.includes('protectedResult.serverLicenseTemplate') && uploadUi.includes('protectedResult.sharedFilesPreserved'), 'resumable per-file compilation includes the one-time generic guard while shared files remain untouched'],
  [!uploadUi.includes('DRIPX_INJECT_LICENSE_GUARD') && patchSource.includes('b.compileTargets=[...(b.compileTargets||[]).filter(target=>target?.name!==guardName),{name:guardName}]'), 'Trabajar compiles the single generic guard and avoids a second missing injection step'],
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
  [zipReader.includes('const compileTargets=entries.filter') && zipReader.includes("type!=='shared'") && zipReader.includes('configLuaNames.has(entry.name)'), 'only declared server/client Lua is compiled and all shared Lua is preserved'],
  [zipReader.includes('productId:window.__DRIPX_REPLACE_PRODUCT_ID||crypto.randomUUID()') && catalogUi.includes('data-dxcm-replace-zip') && catalogUi.includes('window.__DRIPX_REPLACE_PRODUCT_ID=item.id') && patchSource.includes('window.__DRIPX_REPLACE_PRODUCT_ID=null'), 'existing product ZIP replacement reuses the same product identity and clears replacement mode after save'],
  [zipReader.includes("scriptType==='shared'?'shared_lua'"), 'meta.xml-declared shared Lua classification'],
  [zipReader.includes("'dripx_shared_license.lua'") && zipReader.includes("'dripx-cfg.lua'") && zipReader.includes("type==='shared'"), 'shared scripts stay shared and DRIPX modules are reserved'],
  [patchSource.includes('sharedFilesPreserved=true') && !patchSource.includes("working.file('dripx_shared_license.lua',sharedBridge)") && !patchSource.includes('const sharedBridge=['), 'original shared code is gated and the separate public bridge is generated'],
  [patchSource.includes('const sharedScriptTags=originalScriptTags.filter') && patchSource.includes('const otherScriptTags=originalScriptTags.filter'), 'shared scripts are ordered before server/client startup'],
  [zipReader.includes("precompiledShared=type==='shared'") && zipReader.includes('dripxZipMtaBytecode') && zipReader.includes("type==='server'||type==='client'"), 'shared bytecode is preserved and server/client Lua is compiled'],
  [uploadValidator.includes('resource_shared_source_contains_private_marker') && !uploadValidator.includes('shared_license_bridge_missing'), 'upload validator retains shared Lua and validates the bridge'],
  [downloadFunction.includes('resource_shared_source_contains_private_marker') && !downloadFunction.includes('resource_shared_license_bridge_missing') && downloadFunction.includes('resource_server_license_guard_missing'), 'buyer download validates shared bridge and the compiled generic guard'],
  [zipReader.includes("ensureZipUiNode('zip-analysis','div')") && zipReader.includes('analysisNode.innerHTML'), 'ZIP UI nodes guarded before rendering'],
  [uploadUi.includes('function ensureLiveProductZipPreview(inputHint,runId)') && uploadUi.includes('live=ensureLiveProductZipPreview(input,runId)') && uploadUi.includes('window.DRIPX_LOAD_ZIP(file,resolveLiveEngine)'), 'ZIP reader reattaches to the active product form after auth and DOM refreshes'],
  [zipReader.includes('async function loadZipForProtection(file,hostResolver)') && zipReader.includes("typeof hostResolver==='function'?hostResolver():null") && zipReader.includes('host?.isConnected'), 'ZIP reader resolves its UI host again after asynchronous extraction'],
  [zipReader.includes('dripxZipCRC32(data)') && zipReader.includes('LIMITS.expanded'), 'ZIP CRC and expansion limits'],
  [zipReader.includes('const expectedCrcRaw=Number(item.entry._data?.crc32)') && zipReader.includes('expectedCrcRaw>=-0x80000000') && zipReader.includes('expectedCrcRaw>>>0') && ((0x9b2bcb9b|0)<0) && (((0x9b2bcb9b|0)>>>0)===0x9b2bcb9b), 'signed JSZip CRC values are normalized to unsigned before validation'],
  [zipReader.includes('const hasFiveMManifest=') && zipReader.includes('hadOriginalMeta') && zipReader.includes('hasMtaApi') && !zipReader.includes('fivem|fxserver/i.test(infoText)'), 'ZIP platform detection uses MTA manifest/API evidence instead of names and labels'],
  [zipReader.includes("type==='shared'") && zipReader.includes('infoType!==\'script\''), 'MTA metadata and license shared-script integrity'],
  [zipReader.includes('estructura o API exclusiva de FiveM') && zipReader.includes('fiveMApiCount>=2'), 'FiveM rejection requires an explicit manifest or multiple FiveM native API calls'],
  [uploadValidator.includes('meta_info_incomplete') && uploadValidator.includes('meta_script_type_invalid'), 'server-side MTA metadata validation'],
  [downloadFunction.includes('resource_meta_info_incomplete') && downloadFunction.includes('startsAt <= now'), 'download metadata and plan start-time validation'],
  [profileMigration.includes('grant update (leaderboard_public, updated_at)'), 'profile privilege allowlist migration'],
  [privacyMigration.includes('leaderboard_public is true'), 'public leaderboard respects privacy opt-in'],
  [uploadUi.includes('Reintentar / reanudar') && uploadUi.includes('actions.resume()'), 'visible retry and resumable protection action'],
  [uploadUi.includes('function renderProductZipSelection(input,file)') && uploadUi.includes('data-dripx-start-protection') && uploadUi.includes('Trabajar · Proteger y compilar Lua') && uploadUi.includes('DRIPX_INSPECT_ZIP(file)') && uploadUi.includes('async function previewProductZip(file,dialog,resume=false)') && uploadUi.includes('await actions.protect()') && uploadUi.includes('await actions.compile()') && uploadUi.includes('await actions.download()'), 'ZIP selection inventories first and keeps real protection/compilation as a separate optional action'],
  [uploadUi.includes('window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE=file') && uploadUi.includes('DRIP X · INSPECTOR ZIP') && uploadUi.includes('Contenido completo del ZIP') && uploadUi.includes('dialog.succeed()') && uploadUi.includes("status='succeeded'"), 'selected ZIP displays the complete independent inventory and protection only reports success after final verification'],
  [uploadUi.includes("document.addEventListener('change',handleProductZipSelection,true)") && uploadUi.includes("document.addEventListener('input',handleProductZipSelection,true)"), 'ZIP file selection uses capture-phase change and mobile input fallbacks'],
  [uploadUi.includes("const anchor=form.querySelector('#resource-file-field')") && uploadUi.includes("node.classList.remove('hidden')") && uploadUi.includes('Panel recuperado'), 'ZIP preview is reattached outside the collapsible input wrapper with a visible recovery fallback'],
  [uploadUi.includes('Al pulsar Trabajar se inyecta la validación de licencia') && patchSource.includes("protection_enabled:type==='resource'&&protectedSelection") && patchSource.includes("resource_manifest:type==='resource'?fileManifest:{}"), 'original ZIP remains the default upload; protection status and archive inventory are stored separately'],
  [uploadUi.includes('installDescriptionToolbar'), 'description icon toolbar'],
  [patchSource.includes("store_category:type==='resource'?String(fd.get('store_category')||'scripts-mta'):'planes'") && uploadUi.includes('ensureProductStoreCategoryField') && uploadUi.includes('name="store_category"'), 'downloadable product stores a selectable storefront category separately from internal product type'],
  [productMediaMigration.includes('dripx_admin_update_product_details') && productMediaMigration.includes('dripx_is_admin()') && productMediaMigration.includes('store_category=v_category'), 'product category and media updates are admin-only and server-validated'],
  [serverRebindingMigration.includes('dripx_save_account_license_binding') && serverRebindingMigration.includes('is_active=false') && serverRebindingMigration.includes('revoked_at=now()') && serverRebindingMigration.includes('bound_server_ip=v_ip'), 'account server changes revoke the old activation and bind the new IP/port atomically'],
  [uploadCss.includes('.dx-zip-retry') && uploadCss.includes('.dx-description-tools'), 'professional upload/editor styling'],
  [uploadUi.includes('function categoryViewActive()') && uploadUi.includes('async function renderCategoryManager(force=false)') && uploadUi.includes('data-dx-category-action="delete"'), 'complete admin category manager with CRUD controls'],
  [uploadUi.includes("const source=inProductForm?activeNames:activeNames.filter(name=>String(name).trim().toLowerCase()==='planes');") && uploadUi.includes('categorySyncAt=0'), 'internal Productos category stays out of public Plans filters'],
  [appText.includes('Los planes no admiten archivos ZIP') && appText.includes('Crea los recursos en Productos'), 'plan creation rejects ZIP files and directs resources to Productos'],
  [uploadUi.includes('fileWrap.hidden=isPlan') && uploadUi.includes('Configuración de planes') && uploadUi.includes("String(p.category||'').trim().toLowerCase()==='productos'"), 'plan editor assigns only existing published Productos resources and plan forms hide ZIP controls'],
  [uploadCss.includes('.dx-plan-control-hero') && uploadCss.includes('.dx-plan-resource-item') && uploadCss.includes('.dx-product-type-guidance'), 'modern plans dashboard and separated resource form styling'],
  [patchSource.includes("categoryRecord=await call(db.from('dripx_categories')") && patchSource.includes('category:categoryName,'), 'new products must reference an active Supabase category'],
  [categoryMigration.includes('dripx_guard_category_references') && categoryMigration.includes('No se puede eliminar esta categoría'), 'database category rename/delete safeguards'],
  [uploadUi.includes('function isAdminNavigationControl(control)') && uploadUi.includes('!isAdminNavigationControl(control)'), 'category panel only reacts to real admin navigation controls'],
  [uploadUi.includes('if(categoryManagerTimer&&!force)return;') && uploadUi.includes('categoryManagerTimer=0;'), 'category panel render scheduler cannot be starved by repeated DOM mutations'],
  [uploadUi.includes('function installCategoryAuthLifecycle()') && uploadUi.includes("event==='SIGNED_OUT'"), 'category panel session lifecycle only clears on real sign-out/user change'],
  [uploadUi.includes('window.__DRIPX_ADMIN_SESSION_VERIFIED=true') && uploadUi.includes('window.__DRIPX_ADMIN_VERIFIED_USER_ID=String(session.user.id)'), 'category panel keeps verified admin state across transient UI refreshes'],
  [!uploadUi.includes('if(!categoryViewActive()||!client||window.DRIPX_IS_ADMIN!==true)'), 'category panel is not removed by temporary DRIPX_IS_ADMIN UI flag changes'],
  [uploadUi.includes("panel=categoryPanel();\n      if(!panel)throw new Error('La vista administrativa se actualizó"), 'category panel reattaches to the live app after asynchronous category queries'],
  [uploadUi.includes("window.sessionStorage?.setItem('dripx.admin.tab','categorias')") && uploadUi.includes('function syncCategoryRouteFromHash(){'), 'category tab selection survives internal rerenders and browser refreshes'],
  [uploadUi.includes('currentPanel?.dataset.loaded===\'error\'') && uploadUi.includes('if(categoryManagerTimer&&!force)return;'), 'category errors do not trigger mutation-observer retry loops'],
  [patchSource.includes('DRIPX_ZIP_INVENTORY') && patchSource.includes('if(protectedSelection)await validateProtectedResourceZip(file)') && patchSource.includes('if(protectedSelection){') && patchSource.includes('await verifyResourceProductBeforePublish(product.id)'), 'only explicitly protected products use the strict MTA upload validator'],
  [downloadFunction.includes('if (product.protection_enabled !== true)') && downloadFunction.includes('new Response(sourceZip') && downloadFunction.includes('product_not_downloadable'), 'unprotected buyer downloads stream the original private ZIP after entitlement verification'],
  [zipReader.includes('SHADER_FILES_MISSING') && uploadUi.includes('No hay shaders'), 'missing shader files are visibly reported without blocking ZIP publication'],
  [uploadCss.includes('.dx-zip-inspector') && uploadCss.includes('.dx-zip-inspect-row') && uploadCss.includes('.dx-zip-inspect-warning'), 'King-inspired dark archive inspector styles all inventory rows and warning states'],
  [catalogUi.includes('data-dxcm-menu') && catalogUi.includes('dripx_admin_set_catalog_status') && catalogUi.includes('dripx_admin_update_catalog_item'), 'plans and products use three-dot menus with real publish, hide and edit RPCs'],
  [catalogUi.includes("p.category==='Productos'") && catalogUi.includes("p.category==='Planes'") && catalogUi.includes('data-dxcm-form'), 'separate Plans and Products administration lists'],
  [catalogUi.includes('resource_ids') && catalogUi.includes('Aquí no se suben ZIP ni se crean productos nuevos.'), 'plan edit only assigns existing products and never creates ZIP files'],
  [catalogCss.includes('.dxcm-more') && catalogCss.includes('.dxcm-menu') && catalogCss.includes('.dxcm-modal'), 'compact three-dot menu and premium edit modal styling'],
  [catalogUi.includes("db.storage.from('product-images').createSignedUrl") && catalogUi.includes('catalogImageUrl'), 'admin catalog cards resolve real uploaded product thumbnails'],
  [patchSource.includes("const expectedCategory=type==='plan'?'Planes':'Productos'") && patchSource.includes('Los planes no admiten archivos ZIP'), 'product creation enforces separate categories and rejects ZIP on plans'],
  [catalogUi.includes("db.rpc('dripx_admin_create_plan'") && catalogUi.includes('data-dxcm-section-action="create-plan"'), 'plans are created from the Plans menu through a secure no-ZIP RPC'],
  [patchSource.includes('Producto descargable · ZIP · categoría Productos') && appText.includes('<select name="product_type"><option value="resource">Producto descargable · ZIP · categoría Productos</option></select>'), 'the downloadable product form cannot create plans'],
  [catalogCss.includes('.dxcm-section-menu') && catalogUi.includes('data-dxcm-section-action="create-product"'), 'Plans and Products each have a compact create menu']
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
