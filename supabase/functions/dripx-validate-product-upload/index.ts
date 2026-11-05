import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import JSZip from "npm:jszip@3.10.1";
import { Unzip, UnzipInflate } from "npm:fflate@0.8.3";

const HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" } });

function publicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
}
function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}
function safePath(path: string) {
  return !!path && path.length <= 1024 && !path.startsWith("/") && !path.includes("\\")
    && !/[\u0000-\u001f\u007f]/.test(path)
    && !path.split("/").some(part => !part || part === "." || part === "..");
}
function bytecode(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x1c && bytes[1] === 0x4d
    && bytes[2] === 0x76 && bytes[3] === 0x62;
}
function unixMode(value: unknown): number {
  if (typeof value === "string" && /^[0-7]{5,6}$/.test(value)) return parseInt(value, 8);
  return Number(value || 0);
}
function attr(tag: string, name: string) {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return match ? match[2] : "";
}
async function verifyExpandedZip(bytes: Uint8Array) {
  return await new Promise<{ files: number; expanded: number }>((resolve, reject) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    let files = 0, expanded = 0, pending = 0, ended = false, settled = false;
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(reason));
    };
    const finish = () => {
      if (!settled && ended && pending === 0) {
        settled = true;
        resolve({ files, expanded });
      }
    };
    unzip.onfile = file => {
      if (settled) return;
      const name = String(file.name || "");
      if (name.endsWith("/")) return;
      files++;
      if (files > 3000) return fail("ZIP supera el límite de 3.000 archivos.");
      if (!safePath(name)) return fail("ZIP contiene rutas inseguras.");
      if (Number(file.originalSize || 0) > 100 * 1024 * 1024) return fail("Un archivo descomprimido supera 100 MB.");
      pending++;
      let current = 0;
      file.ondata = (error, chunk, final) => {
        if (settled) return;
        if (error) return fail("No se pudo descomprimir una entrada del ZIP.");
        const length = chunk?.byteLength || 0;
        current += length;
        expanded += length;
        if (current > 100 * 1024 * 1024) return fail("Un archivo descomprimido supera 100 MB.");
        if (expanded > 200 * 1024 * 1024) return fail("El ZIP descomprimido supera 200 MB.");
        if (final) {
          pending--;
          finish();
        }
      };
      try { file.start(); }
      catch { fail("El ZIP usa un método de compresión no admitido o dañado."); }
    };
    try {
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, bytes.length);
        unzip.push(bytes.subarray(offset, end), end === bytes.length);
      }
      ended = true;
      finish();
    } catch {
      fail("El ZIP está dañado o no cumple el formato esperado.");
    }
  });
}

async function authorize(req: Request) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const key = publicKey();
  const secret = serviceKey();
  const authorization = req.headers.get("authorization") || "";
  if (!base || !key || !secret || !/^Bearer\s+\S+$/i.test(authorization)) {
    throw new Error("Se requiere una sesión válida.");
  }
  const userResponse = await fetch(base + "/auth/v1/user", {
    headers: { apikey: key, authorization },
    signal: AbortSignal.timeout(8000),
  });
  if (!userResponse.ok) throw new Error("La sesión no es válida.");
  const user = await userResponse.json();
  if (!user?.id) throw new Error("La sesión no es válida.");
  const adminResponse = await fetch(base + "/rest/v1/rpc/dripx_is_admin", {
    method: "POST",
    headers: { apikey: key, authorization, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });
  if (!adminResponse.ok || await adminResponse.json() !== true) {
    throw new Error("Solo administración puede validar recursos para publicación.");
  }
  return { base, secret };
}
async function readRows(base: string, secret: string, path: string) {
  const response = await fetch(base + "/rest/v1/" + path, {
    headers: { apikey: secret, authorization: "Bearer " + secret, accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("No se pudo consultar el producto en Supabase.");
  return await response.json() as Array<Record<string, unknown>>;
}
async function validateProduct(req: Request) {
  const { base, secret } = await authorize(req);
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 8192) return json(413, { error: "request_too_large" });
  const bodyText = await req.text();
  if (new TextEncoder().encode(bodyText).byteLength > 8192) return json(413, { error: "request_too_large" });
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(bodyText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { error: "invalid_request" });
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_request" });
  }
  const productId = String(body.product_id || "").toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(productId)) {
    return json(400, { error: "invalid_product_id" });
  }
  const products = await readRows(base, secret,
    "dripx_products?id=eq." + encodeURIComponent(productId)
    + "&select=id,title,product_type,status,protection_enabled,file_path&limit=1");
  const product = products[0];
  if (!product || product.product_type !== "resource" || product.status !== "draft"
      || product.protection_enabled !== true) {
    return json(409, { error: "product_not_ready_for_validation", message: "El producto debe ser un resource protegido en borrador." });
  }
  const filePath = String(product.file_path || "");
  const expectedPrefix = "products/" + productId + "/";
  if (!filePath.startsWith(expectedPrefix) || !safePath(filePath) || !filePath.toLowerCase().endsWith(".zip")) {
    return json(409, { error: "product_storage_path_invalid" });
  }
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const stored = await fetch(base + "/storage/v1/object/product-files/" + encodedPath, {
    headers: { apikey: secret, authorization: "Bearer " + secret },
    signal: AbortSignal.timeout(30000),
  });
  if (!stored.ok) return json(502, { error: "stored_zip_unavailable" });
  const source = new Uint8Array(await stored.arrayBuffer());
  if (!source.length || source.length > 100 * 1024 * 1024) return json(413, { error: "zip_size_invalid" });
  const streamInfo = await verifyExpandedZip(source);
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(source, { checkCRC32: true }); }
  catch { return json(422, { error: "zip_crc_or_format_invalid" }); }
  const archiveEntries = Object.values(zip.files);
  const archiveFiles = archiveEntries.filter(entry => !entry.dir);
  if (!archiveFiles.length || archiveFiles.length > 3000) return json(422, { error: "zip_file_count_invalid" });
  const seen = new Set<string>();
  for (const entry of archiveEntries) {
    const info = entry as unknown as { unsafeOriginalName?: string; unixPermissions?: number | string; _data?: { uncompressedSize?: number } };
    const original = String(info.unsafeOriginalName || entry.name);
    if (original !== entry.name || !safePath(original) || original.length > 1024) {
      return json(422, { error: "zip_original_path_invalid" });
    }
    if ((unixMode(info.unixPermissions) & 0o170000) === 0o120000) {
      return json(422, { error: "zip_symlink_not_allowed" });
    }
    if (!entry.dir) {
      const key = original.normalize("NFC").toLowerCase();
      if (seen.has(key)) return json(422, { error: "zip_duplicate_path" });
      seen.add(key);
      const size = Number(info._data?.uncompressedSize || 0);
      if (!Number.isSafeInteger(size) || size < 0 || size > 100 * 1024 * 1024) return json(413, { error: "zip_entry_size_invalid" });
    }
  }
  const findByBase = (name: string) => archiveFiles.filter(entry => entry.name.split("/").pop()?.toLowerCase() === name.toLowerCase());
  const metaEntries = findByBase("meta.xml");
  const licenseEntries = findByBase("dripx_license.lua");
  const sharedEntries = findByBase("dripx_guard_shared.lua");
  if (metaEntries.length !== 1 || licenseEntries.length !== 1 || sharedEntries.length !== 1) {
    return json(409, { error: "dripx_guard_files_missing", message: "El ZIP necesita un único meta.xml, dripx_license.lua y dripx_guard_shared.lua." });
  }
  const metaEntry = metaEntries[0], licenseEntry = licenseEntries[0], sharedEntry = sharedEntries[0];
  if (metaEntry.name !== "meta.xml" || licenseEntry.name !== "dripx_license.lua" || sharedEntry.name !== "dripx_guard_shared.lua") {
    return json(409, { error: "dripx_guard_files_must_be_at_root" });
  }
  const [metaText, licenseText, sharedText] = await Promise.all([
    metaEntry.async("string"), licenseEntry.async("string"), sharedEntry.async("string"),
  ]);
  const tokenMatch = licenseText.match(/local DRIPX_SHARED_GUARD_EXPECTED = "([a-f0-9]{48})"/);
  if (!tokenMatch || !licenseText.includes("DRIPX_PRODUCT_ID_PLACEHOLDER")
      || !licenseText.includes("DRIPX_LICENSE_KEY_PLACEHOLDER")
      || !licenseText.includes("DRIPX_ACL_ACCOUNT_PLACEHOLDER")) {
    return json(409, { error: "dripx_license_template_invalid" });
  }
  if (!sharedText.includes('DRIPX_SHARED_LICENSE_GUARD = "' + tokenMatch[1] + '"')) {
    return json(409, { error: "dripx_shared_guard_token_mismatch" });
  }
  const scriptTags = metaText.match(/<script\b[^>]*>/gi) || [];
  const scripts = scriptTags.map(tag => ({
    src: attr(tag, "src").trim().replace(/^\.\//, ""),
    type: (attr(tag, "type").trim().toLowerCase() || "server"),
  }));
  if (!scripts.length) return json(422, { error: "meta_scripts_missing" });
  const available = new Set(archiveFiles.map(entry => entry.name));
  const refs = new Set<string>();
  let compiledCount = 0, serverCompiledCount = 0;
  for (const script of scripts) {
    if (!safePath(script.src) || !available.has(script.src)) return json(422, { error: "meta_script_path_invalid", path: script.src });
    const refKey = script.src.normalize("NFC").toLowerCase();
    if (refs.has(refKey)) return json(422, { error: "meta_script_duplicate" });
    refs.add(refKey);
    const lower = script.src.toLowerCase();
    const configLua = /(^|\/)(config|settings|shared|language|locale)[^/]*\.lua$/i.test(script.src);
    if ((script.type === "server" || script.type === "client") && lower.endsWith(".lua") && !configLua && script.src !== "dripx_license.lua") {
      return json(409, { error: "uncompiled_lua_present", path: script.src });
    }
    if ((script.type === "server" || script.type === "client") && lower.endsWith(".luac")) {
      const entry = zip.file(script.src);
      if (!entry) return json(422, { error: "compiled_script_missing", path: script.src });
      const bytes = await entry.async("uint8array");
      if (!bytecode(bytes)) return json(422, { error: "compiled_bytecode_invalid", path: script.src });
      compiledCount++;
      if (script.type === "server") serverCompiledCount++;
    }
  }
  const sharedIndex = scripts.findIndex(script => script.src === "dripx_guard_shared.lua" && script.type === "shared");
  const licenseIndex = scripts.findIndex(script => script.src === "dripx_license.lua" && script.type === "server");
  if (sharedIndex < 0 || licenseIndex < 0 || sharedIndex >= licenseIndex) {
    return json(409, { error: "dripx_license_meta_order_invalid" });
  }
  if (!serverCompiledCount || !compiledCount) return json(409, { error: "server_lua_not_compiled" });
  return json(200, {
    valid: true,
    product_id: productId,
    file_count: archiveFiles.length,
    compiled_count: compiledCount,
    server_compiled_count: serverCompiledCount,
    expanded_bytes: streamInfo.expanded,
  });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    return await validateProduct(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "product_validation_failed";
    console.error("[DRIPX] Product ZIP validation failed:", message);
    return json(message.includes("sesión") ? 401 : 503, { error: "product_validation_failed", message });
  }
});
