import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import JSZip from "npm:jszip@3.10.1";
import { Unzip, UnzipInflate } from "npm:fflate@0.8.3";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-expose-headers": "content-disposition, content-length",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" },
  });

function observedClientIp(req: Request): string | null {
  const direct = req.headers.get("cf-connecting-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = direct || forwarded || "";
  return candidate && !/[\s,]/.test(candidate) ? candidate : null;
}
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function serviceKey(): string {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try { const parsed = JSON.parse(secretKeys); if (typeof parsed?.default === "string" && parsed.default) return parsed.default; } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}
async function callRpc(name: string, args: Record<string, unknown>) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, ""), secret = serviceKey();
  if (!base || !secret) throw new Error("license_backend_not_configured");
  const response = await fetch(base + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: secret, authorization: "Bearer " + secret, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
  });
  const raw = await response.text(); let data: unknown = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("license_backend_unavailable");
  return data as Record<string, unknown> | null;
}

function publicKey(): string {
  return Deno.env.get("SUPABASE_ANON_KEY")
    || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || "";
}
async function readRows(path: string, key: string) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!base || !key) throw new Error("license_backend_not_configured");
  const response = await fetch(base + "/rest/v1/" + path, {
    headers: { apikey: key, authorization: "Bearer " + key, accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error("database_query_failed_" + response.status);
  return body ? JSON.parse(body) as Array<Record<string, unknown>> : [];
}


function safeZipPath(value: string): boolean {
  return !!value && value.length <= 1024 && !value.startsWith("/")
    && !value.includes("\\")
    && !/[\u0000-\u001f\u007f]/.test(value)
    && !/^[A-Za-z]:/.test(value)
    && !value.split("/").some(part => !part || part === "." || part === ".." || part.length > 255);
}
function isMtaBytecode(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x1c && bytes[1] === 0x4d
    && bytes[2] === 0x76 && bytes[3] === 0x62;
}
function zipUnixMode(value: unknown): number {
  if (typeof value === "string" && /^[0-7]{5,6}$/.test(value)) return parseInt(value, 8);
  return Number(value || 0);
}
function xmlAttribute(tag: string, name: string): string {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return match ? match[2] : "";
}
async function verifyExpandedZip(bytes: Uint8Array) {
  return await new Promise<{ files: number; expanded: number }>((resolve, reject) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    let files = 0, expanded = 0, pending = 0, ended = false, settled = false;
    const seen = new Set<string>();
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
      const directory = name.endsWith("/");
      const path = directory ? name.slice(0, -1) : name;
      if (!safeZipPath(path)) return fail("El ZIP contiene una ruta insegura.");
      if (directory) return;
      files++;
      if (files > 3000) return fail("El ZIP supera el límite de 3.000 archivos.");
      const key = path.normalize("NFC").toLowerCase();
      if (seen.has(key)) return fail("El ZIP contiene rutas duplicadas.");
      seen.add(key);
      if (Number(file.originalSize || 0) > 100 * 1024 * 1024) {
        return fail("Un archivo descomprimido supera 100 MB.");
      }
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
      catch { fail("El ZIP usa un método de compresión no admitido o está dañado."); }
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

async function downloadOwnedProduct(req: Request) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const anon = publicKey(), service = serviceKey();
  const authorization = req.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  const accessToken = tokenMatch?.[1] || "";
  if (!base || !anon || !service || !accessToken) {
    return json(401, { error: "authentication_required" });
  }

  const userResponse = await fetch(base + "/auth/v1/user", {
    headers: { apikey: anon, authorization: "Bearer " + accessToken },
    signal: AbortSignal.timeout(8000),
  });
  if (!userResponse.ok) return json(401, { error: "invalid_session" });
  const user = await userResponse.json();
  if (!user?.id) return json(401, { error: "invalid_session" });

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) return json(413, { error: "request_too_large" });
  const requestText = await req.text();
  if (new TextEncoder().encode(requestText).byteLength > 4096) {
    return json(413, { error: "request_too_large" });
  }
  let raw: Record<string, unknown>;
  try {
    const parsed = JSON.parse(requestText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "invalid_request" });
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_request" });
  }
  const productId = String(raw.product_id || "").toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(productId)) {
    return json(400, { error: "invalid_product_id" });
  }

  const [profiles, products, directEntitlements, activePlans, approvedOrders, planMappings] = await Promise.all([
    readRows("dripx_profiles?user_id=eq." + encodeURIComponent(user.id) + "&select=active&limit=1", service),
    readRows(
      "dripx_products?id=eq." + encodeURIComponent(productId)
        + "&select=id,title,product_type,status,protection_enabled,file_path&limit=1",
      service,
    ),
    readRows(
      "dripx_entitlements?user_id=eq." + encodeURIComponent(user.id)
        + "&product_id=eq." + encodeURIComponent(productId)
        + "&active=eq.true&select=id,order_id&limit=100",
      service,
    ),
    readRows(
      "dripx_user_plans?user_id=eq." + encodeURIComponent(user.id)
        + "&active=eq.true&select=product_id,order_id,starts_at,expires_at&limit=100",
      service,
    ),
    readRows(
      "dripx_orders?user_id=eq." + encodeURIComponent(user.id)
        + "&status=eq.approved&select=id&limit=1000",
      service,
    ),
    readRows(
      "dripx_plan_resources?resource_product_id=eq." + encodeURIComponent(productId)
        + "&select=plan_product_id&limit=100",
      service,
    ),
  ]);

  if (profiles.length !== 1 || profiles[0]?.active !== true) {
    return json(403, { error: profiles[0]?.active === false ? "account_suspended" : "account_profile_inactive" });
  }
  const product = products[0];
  if (!product || !["published", "archived"].includes(String(product.status))) {
    return json(404, { error: "product_not_available" });
  }
  if (product.product_type !== "resource") {
    return json(409, { error: "product_not_downloadable" });
  }

  // Entitlements without an order remain valid for explicit admin grants and free products.
  // Linked purchases are accepted only if their own order was approved.
  const approvedOrderIds = new Set(approvedOrders.map(order => String(order.id)));
  const directAccess = directEntitlements.some(row =>
    !row.order_id || approvedOrderIds.has(String(row.order_id))
  );

  const planProductIds = [...new Set(activePlans
    .map(plan => String(plan.product_id || ""))
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))];
  const planProducts = planProductIds.length
    ? await readRows(
      "dripx_products?id=in.(" + planProductIds.map(encodeURIComponent).join(",")
        + ")&select=id,product_type,status&limit=100",
      service,
    )
    : [];
  const validPlanProducts = new Set(planProducts
    .filter(plan => plan.product_type === "plan" && ["published", "archived"].includes(String(plan.status)))
    .map(plan => String(plan.id)));
  const now = Date.now();
  const mappedPlanIds = new Set(planMappings.map(row => String(row.plan_product_id)));
  const planAccess = activePlans.some(plan => {
    const planId = String(plan.product_id || "");
    const startsAt = new Date(String(plan.starts_at || "")).getTime();
    const expiresAt = plan.expires_at == null ? null : new Date(String(plan.expires_at)).getTime();
    return mappedPlanIds.has(planId)
      && validPlanProducts.has(planId)
      && Number.isFinite(startsAt) && startsAt <= now
      && (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now))
      && (!plan.order_id || approvedOrderIds.has(String(plan.order_id)));
  });
  if (!directAccess && !planAccess) {
    return json(403, { error: "product_not_owned_or_plan_expired" });
  }

  const filePath = String(product.file_path || "");
  const pathParts = filePath.split("/");
  if (
    filePath.length > 512
    || !filePath.startsWith("products/" + productId + "/")
    || !filePath.toLowerCase().endsWith(".zip")
    || !safeZipPath(filePath)
    || pathParts.length < 3
    || pathParts.some(part => part.length > 180)
  ) {
    return json(409, { error: "protected_file_path_invalid" });
  }

  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const storageResponse = await fetch(base + "/storage/v1/object/product-files/" + encodedPath, {
    headers: { apikey: service, authorization: "Bearer " + service },
    signal: AbortSignal.timeout(30000),
  });
  if (!storageResponse.ok) return json(502, { error: "protected_file_unavailable" });
  const sourceZip = new Uint8Array(await storageResponse.arrayBuffer());
  if (!sourceZip.length || sourceZip.byteLength > 50_000_000) {
    return json(413, { error: "product_file_size_invalid" });
  }

  let streamInfo: { files: number; expanded: number };
  try {
    streamInfo = await verifyExpandedZip(sourceZip);
  } catch (error) {
    return json(422, {
      error: "product_zip_expansion_invalid",
      reason: error instanceof Error ? error.message : "invalid_zip_expansion",
    });
  }

  // Unprotected products are delivered byte-for-byte from the private bucket.
  // Ownership was already checked above; no MTA manifest or compiler is required.
  if (product.protection_enabled !== true) {
    const safeName = String(product.title || "DRIPX-resource")
      .replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 64) || "DRIPX-resource";
    return new Response(sourceZip, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/zip",
        "content-disposition": "attachment; filename=\"" + safeName + ".zip\"",
        "content-length": String(sourceZip.byteLength),
      },
    });
  }

  const accountLicenses = await readRows(
    "account_licenses?user_id=eq." + encodeURIComponent(user.id)
      + "&select=status,bound_server_ip,bound_server_port&limit=1",
    service,
  );
  const accountLicense = accountLicenses[0];
  if (accountLicenses.length !== 1 || accountLicense?.status !== "active") {
    return json(409, { error: "account_license_not_ready" });
  }
  if (!accountLicense.bound_server_ip || !accountLicense.bound_server_port) {
    return json(409, { error: "server_binding_required" });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(sourceZip, { checkCRC32: true, createFolders: false });
  } catch {
    return json(422, { error: "product_zip_crc_or_format_invalid" });
  }

  const archiveEntries = Object.values(zip.files);
  const archiveFiles = archiveEntries.filter(entry => !entry.dir);
  if (!archiveFiles.length || archiveFiles.length > 3000 || archiveFiles.length !== streamInfo.files) {
    return json(422, { error: "product_zip_file_count_invalid" });
  }

  const seenPaths = new Set<string>();
  for (const entry of archiveEntries) {
    const info = entry as unknown as {
      unsafeOriginalName?: string;
      unixPermissions?: number | string;
    };
    const originalPath = String(info.unsafeOriginalName ?? entry.name);
    const path = entry.dir && originalPath.endsWith("/") ? originalPath.slice(0, -1) : originalPath;
    if (originalPath !== entry.name || !safeZipPath(path)) {
      return json(422, { error: "product_zip_unsafe_path" });
    }
    const mode = zipUnixMode(info.unixPermissions);
    if ((mode & 0o170000) === 0o120000) {
      return json(422, { error: "product_zip_symlink_not_allowed" });
    }
    const pathKey = path.normalize("NFC").toLowerCase();
    if (seenPaths.has(pathKey)) {
      return json(422, { error: "product_zip_duplicate_path" });
    }
    seenPaths.add(pathKey);
  }

  const meta = zip.file("meta.xml");
  if (!meta) return json(409, { error: "resource_meta_missing" });
  const metaEntries = archiveFiles.filter(entry => entry.name.toLowerCase().split("/").pop() === "meta.xml");
  if (metaEntries.length !== 1 || metaEntries[0].name !== "meta.xml") {
    return json(409, { error: "resource_meta_root_invalid" });
  }
  const metaBytes = await meta.async("uint8array");
  if (!metaBytes.length || metaBytes.byteLength > 2 * 1024 * 1024) {
    return json(413, { error: "resource_meta_size_invalid" });
  }
  const metaText = new TextDecoder("utf-8", { fatal: true }).decode(metaBytes);
  const infoTag = metaText.match(/<info\b[^>]*>/i);
  if (!infoTag) return json(409, { error: "resource_meta_info_missing" });
  const infoName = xmlAttribute(infoTag[0], "name").trim();
  const infoAuthor = xmlAttribute(infoTag[0], "author").trim();
  const infoVersion = xmlAttribute(infoTag[0], "version").trim();
  const infoType = xmlAttribute(infoTag[0], "type").trim().toLowerCase();
  if (!infoName || !infoAuthor || !infoVersion || infoName.length > 120
      || infoAuthor.length > 120 || infoVersion.length > 40 || infoType !== "script") {
    return json(409, { error: "resource_meta_info_incomplete" });
  }

  if (
    /<!DOCTYPE|<!ENTITY/i.test(metaText)
    || !/<meta(?:\s|>)/i.test(metaText)
    || !/<\/meta\s*>/i.test(metaText)
  ) {
    return json(422, { error: "resource_meta_invalid" });
  }
  const marker = metaText.match(/DRIPX_PRODUCT_ID:\s*([0-9a-f-]{36})/i);
  if (!marker || marker[1].toLowerCase() !== productId) {
    return json(409, { error: "resource_product_id_mismatch" });
  }

  const available = new Map(archiveFiles.map(entry => [entry.name.normalize("NFC").toLowerCase(), entry]));
  const tags = metaText.match(/<script\b[^>]*>/gi) || [];
  if (!tags.length) return json(409, { error: "resource_scripts_missing" });
  const scriptRefs = new Set<string>();
  const sharedBridges: string[] = [];
  const serverLicenseGuards: string[] = [];
  const serverLicenseConfigs: string[] = [];
  let compiledCount = 0, serverCompiledCount = 0, sharedCompiledCount = 0;
  for (const tag of tags) {
    let src = xmlAttribute(tag, "src").trim();
    const type = (xmlAttribute(tag, "type").trim().toLowerCase() || "server");
    if (src.startsWith("./")) src = src.slice(2);
    if (!["server", "client", "shared"].includes(type) || !safeZipPath(src)) {
      return json(422, { error: "resource_meta_script_invalid" });
    }
    const key = src.normalize("NFC").toLowerCase();
    if (scriptRefs.has(key)) return json(422, { error: "resource_meta_script_duplicate" });
    scriptRefs.add(key);
    const entry = available.get(key);
    if (!entry) return json(422, { error: "resource_meta_script_missing", path: src });
    const lower = src.toLowerCase();
    if (type === "shared" && lower === "dripx_shared_license.lua") {
      sharedBridges.push(src);
    } else if (type === "shared" && lower.endsWith(".lua")) {
      const sharedSource = await entry.async("string");
      if (sharedSource.includes("DRIPX_LICENSE_KEY_PLACEHOLDER")) {
        return json(409, { error: "resource_shared_source_contains_private_marker", path: src });
      }
    } else if (type === "shared" && lower.endsWith(".luac")) {
      const output = await entry.async("uint8array");
      if (!isMtaBytecode(output)) return json(422, { error: "resource_shared_bytecode_invalid", path: src });
      compiledCount++;
      sharedCompiledCount++;
    }
    if (type === "server" && lower === "dripx-cfg.lua") {
      serverLicenseConfigs.push(src);
    } else if (type === "server" && lower === "dripx_server_license.luac") {
      const guardBytes = await entry.async("uint8array");
      if (!isMtaBytecode(guardBytes)) return json(422, { error: "resource_server_license_guard_bytecode_invalid" });
      serverLicenseGuards.push(src);
    } else if ((type === "server" || type === "client") && lower.endsWith(".lua")) {
      return json(409, { error: "resource_uncompiled_lua_present", path: src });
    } else if ((type === "server" || type === "client") && lower.endsWith(".luac")) {
      const output = await entry.async("uint8array");
      if (!isMtaBytecode(output)) return json(422, { error: "resource_compiled_bytecode_invalid", path: src });
      compiledCount++;
      if (type === "server") serverCompiledCount++;
    }
  }

  if (sharedBridges.length !== 1) return json(409, { error: "resource_shared_license_bridge_missing" });
  if (serverLicenseGuards.length !== 1) {
    return json(409, { error: "resource_server_license_guard_missing" });
  }
  if (serverLicenseConfigs.length !== 1) {
    return json(409, { error: "resource_server_license_config_missing" });
  }
  const configTagIndex = tags.findIndex(tag => xmlAttribute(tag, "src").trim().replace(/^\.\//, "").toLowerCase() === "dripx-cfg.lua");
  const guardTagIndex = tags.findIndex(tag => xmlAttribute(tag, "src").trim().replace(/^\.\//, "").toLowerCase() === "dripx_server_license.lua");
  if (configTagIndex < 0 || guardTagIndex < 0 || configTagIndex >= guardTagIndex) {
    return json(409, { error: "resource_server_license_config_load_order_invalid" });
  }
  const sharedBridge = zip.file(sharedBridges[0]);
  if (!sharedBridge) return json(409, { error: "resource_shared_license_bridge_missing" });
  const sharedText = await sharedBridge.async("string");
  if (sharedText.includes("DRIPX_LICENSE_KEY_PLACEHOLDER")
      || !sharedText.includes("DRIPX_LICENSE_EVENT_NAME")) {
    return json(409, { error: "resource_shared_license_bridge_invalid" });
  }

  // The delivered ZIP is a single generic release shared by all authorized buyers.
  // The buyer enters their own account key into the editable DRIPX-CFG.LUA on their MTA server.
  const configPath = serverLicenseConfigs[0];
  const configEntry = zip.file(configPath);
  if (!configEntry) return json(409, { error: "resource_server_license_config_missing" });
  const configSource = await configEntry.async("string");
  const placeholder = "DRIPX_LICENSE_KEY_PLACEHOLDER";
  if (configSource.split(placeholder).length !== 2
      || !configSource.includes('DRIPX_CFG_LICENSE_KEY = "' + placeholder + '"')
      || !configSource.includes('DRIPX_CFG_PRODUCT_ID = "' + productId + '"')) {
    return json(409, { error: "resource_server_license_config_invalid" });
  }

  const guardPath = serverLicenseGuards[0];
  const guardEntry = zip.file(guardPath);
  if (!guardEntry) return json(409, { error: "resource_server_license_guard_missing" });
  const guardBytes = await guardEntry.async("uint8array");
  if (!isMtaBytecode(guardBytes)) {
    return json(422, { error: "resource_server_license_guard_bytecode_invalid" });
  }

  const configTagIndex = tags.findIndex(tag =>
    xmlAttribute(tag, "src").trim().replace(/^\.\//, "").toLowerCase() === configPath.toLowerCase()
  );
  const guardTagIndex = tags.findIndex(tag =>
    xmlAttribute(tag, "src").trim().replace(/^\.\//, "").toLowerCase() === guardPath.toLowerCase()
  );
  if (configTagIndex < 0 || guardTagIndex < 0 || configTagIndex >= guardTagIndex) {
    return json(409, { error: "resource_server_license_config_load_order_invalid" });
  }

  const safeName = String(product.title || "DRIPX-resource")
    .replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 64) || "DRIPX-resource";
  return new Response(sourceZip, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/zip",
      "content-disposition": "attachment; filename=\"" + safeName + ".zip\"",
      "content-length": String(sourceZip.byteLength),
      "x-dripx-package": "generic-v1",
    },
  });
}

async function dispatchDiscord(eventKey: string, details: Record<string, unknown>) {
  try {
    const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, ""), secret = serviceKey();
    if (!base || !secret) return;
    const configResponse = await fetch(base + "/rest/v1/rpc/dripx_internal_get_discord_log_setting", {
      method: "POST",
      headers: {
        apikey: secret,
        authorization: "Bearer " + secret,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ p_category: "licenses" }),
      signal: AbortSignal.timeout(7000),
    });
    if (!configResponse.ok) {
      console.error("[DRIPX] Could not load the configured Licenses webhook:", configResponse.status);
      return;
    }
    const config = await configResponse.json();
    const setting = Array.isArray(config) ? config[0] : config;
    const webhook = String(setting?.webhook_url || "");
    if (setting?.enabled !== true || !webhook) return;
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(webhook)) {
      console.error("[DRIPX] Configured Licenses webhook has an invalid format.");
      return;
    }
    const isActivated = eventKey === "license_activated";
    const fields = Object.entries(details).slice(0, 10).map(([name, value]) => ({
      name: String(name).replace(/[_-]+/g, " ").slice(0, 80),
      value: String(value ?? "—").slice(0, 900) || "—",
      inline: true,
    }));
    const target = new URL(webhook);
    target.searchParams.set("wait", "true");
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "DRIP X SHOP · Licencias",
        allowed_mentions: { parse: [] },
        embeds: [{
          title: isActivated ? "Licencia DRIPX activada" : "Activación DRIPX rechazada",
          description: isActivated
            ? "Un resource MTA:SA ha validado su licencia DRIPX."
            : "Un resource MTA:SA no pudo validar su licencia DRIPX.",
          color: isActivated ? 0x00C7FF : 0xE74C3C,
          author: { name: "DRIP X SHOP", icon_url: "https://dripxshop.vercel.app/assets/dripx-logo.webp" },
          fields,
          timestamp: new Date().toISOString(),
          footer: { text: "DRIP X SHOP · Sistema de licencias" },
        }],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) {
      console.error("[DRIPX] Discord rejected the license embed:", response.status, (await response.text()).slice(0, 240));
    }
  } catch (error) {
    console.error("[DRIPX] License logging failed:", error instanceof Error ? error.message : "unknown");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { valid: false, reason: "method_not_allowed" });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).at(-1);
  if (action === "download") {
    try { return await downloadOwnedProduct(req); }
    catch (error) {
      const reason = error instanceof Error ? error.message : "product_download_failed";
      console.error("[DRIPX] Product download failed:", reason);
      return json(503, { error: "product_download_unavailable", reason });
    }
  }
  if (action !== "activate" && action !== "validate") return json(404, { valid: false, reason: "route_not_found" });
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 4096) return json(413, { valid: false, reason: "request_too_large" });
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { valid: false, reason: "invalid_request" });
    if (JSON.stringify(body).length > 4096) return json(413, { valid: false, reason: "request_too_large" });
    const key = String(body.license_key || "").trim().toUpperCase();
    const installationId = String(body.installation_id || "").trim().toLowerCase();
    const serverName = String(body.server_name || "Servidor MTA").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 100) || "Servidor MTA";
    const productId = String(body.product_id || "").trim().toLowerCase();
    const resourceName = String(body.resource_name || "").trim();
    const serverPort = Number(body.server_port), serverIp = observedClientIp(req);
    if (!/^DRIPX-[A-F0-9]{48}$/.test(key)) return json(400, { valid: false, reason: "invalid_license_key_format" });
    if (!/^[a-f0-9]{40}$/.test(installationId)) return json(400, { valid: false, reason: "invalid_installation_id" });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(productId)) return json(400, { valid: false, reason: "invalid_product_id" });
    if (!resourceName || resourceName.length > 64 || /[\\x00-\\x1f\\x7f]/.test(resourceName)) return json(400, { valid: false, reason: "invalid_resource_name" });
    if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535) return json(400, { valid: false, reason: "invalid_server_port" });
    if (!serverIp) return json(400, { valid: false, reason: "server_ip_not_observed" });
    const rpcName = action === "activate" ? "dripx_service_activate_account_resource" : "dripx_service_validate_account_resource";
    const keyHash = await sha256(key.toLowerCase());
    const args: Record<string, unknown> = {
      p_key_hash: keyHash,
      p_installation_id: installationId,
      p_resource_name: productId,
      p_server_ip: serverIp,
      p_server_port: serverPort,
      p_server_name: serverName,
    };
    const result = await callRpc(rpcName, args);
    if (result?.valid === true) {
      if (action === "activate") {
        void dispatchDiscord("license_activated", {
          server: serverName, ip: serverIp, port: serverPort,
          resource: resourceName, product_id: productId,
          license: result.license_id || "DRIPX",
        });
      }
      return json(200, {
        valid: true,
        reason: result.reason || "validated",
        product_id: result.product_id,
        resource_name: resourceName, product_id: productId,
        license_id: result.license_id,
        max_activations: result.max_activations,
        bound_ip: result.bound_ip,
        bound_port: result.bound_port,
        account_license: result.account_license === true,
      });
    }
    const reason = typeof result?.reason === "string" ? result.reason : "license_invalid";
    if (action === "activate") {
      void dispatchDiscord("license_rejected", { server: serverName, ip: serverIp, port: serverPort, resource: resourceName, product_id: productId, reason });
    }
    const status = ["activation_limit_reached", "binding_change_requires_admin"].includes(reason) ? 409 : 403;
    return json(status, {
      valid: false, reason, max_activations: result?.max_activations,
      activation_count: result?.activation_count, bound_ip: result?.bound_ip, bound_port: result?.bound_port,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "license_service_unavailable";
    const status = reason === "license_backend_not_configured" ? 503 : 400;
    console.error("[DRIPX] Resource licence request failed:", reason);
    return json(status, { valid: false, reason });
  }
});
