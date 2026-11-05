import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import JSZip from "npm:jszip@3.10.1";

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
async function compileLicenseModule(source: string): Promise<Uint8Array> {
  const isMtaBytecode = (bytes: Uint8Array) =>
    bytes.length >= 4 && bytes[0] === 0x1c && bytes[1] === 0x4d
      && bytes[2] === 0x76 && bytes[3] === 0x62;
  let lastError = "mta_compiler_unavailable";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const form = new FormData();
      form.set("compile", "1");
      form.set("debug", "0");
      form.set("obfuscate", "3");
      form.set("Submit", "Submit");
      form.set("luasource", new Blob([source], { type: "text/plain" }), "dripx_license.lua");
      const response = await fetch("https://luac.mtasa.com/index.php", {
        method: "POST",
        body: form,
        headers: { "user-agent": "DRIP-X-SHOP-License-Compiler/2.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        lastError = "mta_compiler_http_" + response.status;
        if (![429,500,502,503,504].includes(response.status) || attempt === 3) break;
      } else {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 8 * 1024 * 1024) throw new Error("compiled_output_too_large");
        const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 240))).trim();
        if (head.startsWith("ERROR")) throw new Error("mta_compiler_rejected_license_module");
        if (isMtaBytecode(bytes)) return bytes;
        lastError = bytes.length ? "mta_bytecode_signature_invalid" : "empty_compiler_response";
        if (attempt === 3) break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message.slice(0,120) : "mta_compiler_network_error";
      if (attempt === 3) break;
    }
    await new Promise(resolve => setTimeout(resolve, 450 * attempt));
  }
  throw new Error(lastError);
}

async function downloadOwnedProduct(req: Request) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const anon = publicKey(), service = serviceKey();
  const accessToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!base || !anon || !service || !accessToken) return json(401, { error: "authentication_required" });
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
  let raw: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(requestText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      raw = parsed as Record<string, unknown>;
    }
  } catch {
    return json(400, { error: "invalid_request" });
  }
  const productId = String(raw?.product_id || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return json(400, { error: "invalid_product_id" });
  }

  const [profiles, products, directEntitlements, activePlans, approvedOrders, planMappings] = await Promise.all([
    readRows("dripx_profiles?user_id=eq." + encodeURIComponent(user.id) + "&select=active&limit=1", service),
    readRows(
      "dripx_products?id=eq." + encodeURIComponent(productId) + "&select=id,title,product_type,status,protection_enabled,file_path&limit=1",
      service,
    ),
    readRows(
      "dripx_entitlements?user_id=eq." + encodeURIComponent(user.id) + "&product_id=eq." + encodeURIComponent(productId) + "&active=eq.true&select=id,order_id&limit=100",
      service,
    ),
    readRows(
      "dripx_user_plans?user_id=eq." + encodeURIComponent(user.id) + "&active=eq.true&select=product_id,order_id,expires_at&limit=100",
      service,
    ),
    readRows(
      "dripx_orders?user_id=eq." + encodeURIComponent(user.id) + "&status=eq.approved&select=id&limit=1000",
      service,
    ),
    readRows(
      "dripx_plan_resources?resource_product_id=eq." + encodeURIComponent(productId) + "&select=plan_product_id&limit=100",
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
  if (product.product_type !== "resource" || product.protection_enabled !== true) {
    return json(409, { error: "product_not_protected", message: "Este resource todavía no tiene la protección DRIPX activada." });
  }
  const approvedOrderIds = new Set(approvedOrders.map(order => String(order.id)));
  const directAccess = directEntitlements.some(row => !row.order_id || approvedOrderIds.has(String(row.order_id)));
  const mappedPlanIds = new Set(planMappings.map(row => String(row.plan_product_id)));
  const planAccess = activePlans.some(plan =>
    mappedPlanIds.has(String(plan.product_id))
    && (!plan.expires_at || new Date(String(plan.expires_at)).getTime() > Date.now())
    && (!plan.order_id || approvedOrderIds.has(String(plan.order_id)))
  );
  if (!directAccess && !planAccess) return json(403, { error: "product_not_owned_or_plan_expired" });

  const filePath = String(product.file_path || "");
  if (!filePath) return json(409, { error: "protected_file_missing" });
  const pathParts = filePath.split("/");
  if (
    filePath.length > 512
    || filePath.startsWith("/")
    || filePath.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(filePath)
    || pathParts.length < 2
    || pathParts.some(part => !part || part === "." || part === "..")
    || pathParts.some(part => part.length > 180)
  ) {
    return json(409, { error: "protected_file_path_invalid" });
  }
  const accountLicense = await callRpc("dripx_internal_get_account_license", { p_user_id: user.id });
  const licenseKey = String(accountLicense?.license_key || "");
  const aclAccount = String(accountLicense?.authorized_account_name || "");
  if (!/^DRIPX-[A-F0-9]{48}$/.test(licenseKey)) {
    return json(409, { error: "account_license_not_ready", message: "No existe una licencia permanente activa para esta cuenta. Abre tu panel de Licencia o contacta con administración." });
  }
  if (aclAccount && !/^[A-Za-z0-9_.-]{1,64}$/.test(aclAccount)) {
    return json(409, { error: "acl_account_name_invalid", message: "El nombre de cuenta MTA configurado no es válido." });
  }

  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const storageResponse = await fetch(base + "/storage/v1/object/product-files/" + encodedPath, {
    headers: { apikey: service, authorization: "Bearer " + service },
    signal: AbortSignal.timeout(30000),
  });
  if (!storageResponse.ok) return json(502, { error: "protected_file_unavailable" });
  const sourceZip = new Uint8Array(await storageResponse.arrayBuffer());
  if (!sourceZip.length || sourceZip.length > 100 * 1024 * 1024) return json(413, { error: "product_file_size_invalid" });
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(sourceZip, { checkCRC32: false }); }
  catch { return json(422, { error: "product_zip_invalid" }); }

  const archiveEntries = Object.values(zip.files);
  const archiveFiles = archiveEntries.filter(entry => !entry.dir);
  if (!archiveFiles.length || archiveFiles.length > 3000) {
    return json(422, { error: "product_zip_file_count_invalid" });
  }
  let totalUncompressedBytes = 0;
  const seenArchivePaths = new Set<string>();
  for (const entry of archiveEntries) {
    const info = entry as unknown as {
      unsafeOriginalName?: string;
      unixPermissions?: number | string;
      _data?: { uncompressedSize?: number };
    };
    const originalPath = String(info.unsafeOriginalName || entry.name);
    const pathWithoutDirectorySlash = entry.dir && originalPath.endsWith("/")
      ? originalPath.slice(0, -1)
      : originalPath;
    const segments = pathWithoutDirectorySlash.split("/");
    if (
      originalPath !== entry.name
      || !pathWithoutDirectorySlash
      || pathWithoutDirectorySlash.startsWith("/")
      || pathWithoutDirectorySlash.includes("\\")
      || pathWithoutDirectorySlash.length > 1024
      || /[\u0000-\u001f\u007f]/.test(pathWithoutDirectorySlash)
      || segments.some(part => !part || part === "." || part === "..")
    ) {
      return json(422, { error: "product_zip_unsafe_path" });
    }
    const unixMode = Number(info.unixPermissions || 0);
    if ((unixMode & 0o170000) === 0o120000) {
      return json(422, { error: "product_zip_symlink_not_allowed" });
    }
    if (!entry.dir) {
      const normalizedPath = entry.name.toLowerCase();
      if (seenArchivePaths.has(normalizedPath)) {
        return json(422, { error: "product_zip_duplicate_path" });
      }
      seenArchivePaths.add(normalizedPath);
      const size = Number(info._data?.uncompressedSize);
      if (!Number.isSafeInteger(size) || size < 0 || size > 200 * 1024 * 1024) {
        return json(413, { error: "product_zip_entry_size_invalid" });
      }
      totalUncompressedBytes += size;
      if (totalUncompressedBytes > 200 * 1024 * 1024) {
        return json(413, { error: "product_zip_expanded_size_invalid" });
      }
    }
  }

  const findByBasename = (name: string) => Object.values(zip.files).filter(entry =>
    !entry.dir && entry.name.split("/").pop()?.toLowerCase() === name.toLowerCase()
  );
  const licenseEntries = findByBasename("dripx_license.lua");
  const sharedEntries = findByBasename("dripx_guard_shared.lua");
  const metaEntries = findByBasename("meta.xml");
  if (licenseEntries.length !== 1 || sharedEntries.length !== 1 || metaEntries.length !== 1) {
    return json(409, { error: "license_guard_files_incomplete", message: "El ZIP no incluye de forma única el módulo de licencia, la marca shared y meta.xml. Vuelve a proteger el producto." });
  }
  const licenseEntry = licenseEntries[0], sharedEntry = sharedEntries[0], metaEntry = metaEntries[0];
  const rootOf = (name: string) => name.includes("/") ? name.slice(0, name.lastIndexOf("/") + 1) : "";
  if (new Set([licenseEntry.name, sharedEntry.name, metaEntry.name].map(rootOf)).size !== 1) {
    return json(409, { error: "license_guard_files_root_mismatch" });
  }
  const entrySize = (entry: typeof licenseEntry) =>
    Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0);
  if (entrySize(licenseEntry) > 2 * 1024 * 1024
      || entrySize(sharedEntry) > 512 * 1024
      || entrySize(metaEntry) > 2 * 1024 * 1024) {
    return json(413, { error: "license_guard_metadata_too_large" });
  }
  const template = await licenseEntry.async("string");
  const sharedSource = await sharedEntry.async("string");
  const metaText = await metaEntry.async("string");
  const tokenMatch = template.match(/local DRIPX_SHARED_GUARD_EXPECTED = "([a-f0-9]{48})"/);
  if (!tokenMatch) return json(409, { error: "license_guard_token_missing" });
  const token = tokenMatch[1];
  const sharedMarker = 'DRIPX_SHARED_LICENSE_GUARD = "' + token + '"';
  const metaHasShared = /<script\b(?=[^>]*\bsrc\s*=\s*["'][^"']*dripx_guard_shared\.lua["'])(?=[^>]*\btype\s*=\s*["']shared["'])[^>]*>/i.test(metaText);
  const metaHasLicense = /<script\b(?=[^>]*\bsrc\s*=\s*["'][^"']*dripx_license\.lua["'])(?=[^>]*\btype\s*=\s*["']server["'])[^>]*>/i.test(metaText);
  if (!sharedSource.includes(sharedMarker)
      || !template.includes("DRIPX_PRODUCT_ID_PLACEHOLDER")
      || !template.includes("DRIPX_LICENSE_KEY_PLACEHOLDER")
      || !template.includes("DRIPX_ACL_ACCOUNT_PLACEHOLDER")
      || !metaHasShared || !metaHasLicense
      || metaText.indexOf("dripx_guard_shared.lua") > metaText.indexOf("dripx_license.lua")) {
    return json(409, { error: "license_guard_template_invalid", message: "No se pudo verificar la relación entre el guardián shared y el módulo de licencia." });
  }

  const luaQuote = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, "");
  const personalized = template
    .replaceAll("DRIPX_PRODUCT_ID_PLACEHOLDER", productId)
    .replaceAll("DRIPX_LICENSE_KEY_PLACEHOLDER", luaQuote(licenseKey))
    .replaceAll("DRIPX_ACL_ACCOUNT_PLACEHOLDER", luaQuote(aclAccount));
  const compiledLicense = await compileLicenseModule(personalized);
  zip.remove(licenseEntry.name);
  const compiledPath = licenseEntry.name.replace(/\.lua$/i, ".luac");
  zip.file(compiledPath, compiledLicense);
  const updatedMeta = metaText.replace(
    /(<script\b[^>]*\bsrc\s*=\s*["'][^"']*?)dripx_license\.lua(["'][^>]*>)/i,
    "$1dripx_license.luac$2",
  );
  if (updatedMeta === metaText) return json(409, { error: "license_meta_rewrite_failed" });
  zip.file(metaEntry.name, updatedMeta);

  const output = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  if (output.byteLength > 220 * 1024 * 1024) {
    return json(413, { error: "personalized_zip_output_too_large" });
  }
  const safeName = String(product.title || "DRIPX-resource").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 64) || "DRIPX-resource";
  return new Response(output, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/zip",
      "content-disposition": "attachment; filename=\"" + safeName + "-DRIPX.zip\"",
      "content-length": String(output.byteLength),
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
