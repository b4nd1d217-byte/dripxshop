import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://dripxshop.vercel.app",
  "https://dripxshop-nuevo.vercel.app",
  "https://dripxshop-bandidito-17.vercel.app",
]);
const LOGO_URL = "https://dripxshop.vercel.app/assets/dripx-logo.webp";
const EVENT_CATEGORY: Record<string, string> = {
  user_registered: "security",
  login: "security",
  logout: "security",
  ticket_created: "support",
  ticket_message: "support",
  ticket_deleted: "support",
  order_created: "sales_private",
  free_product_claimed: "store",
  payment_proof: "sales_private",
  payment_approved: "sales_private",
  payment_rejected: "sales_private",
  review_created: "reviews",
  review_updated: "reviews",
  license_activated: "licenses",
  license_rejected: "licenses",
  resource_created: "store",
  resource_compiled: "store",
  resource_protected: "store",
  coupon_created: "coupons",
  admin_action: "security",
  security_alert: "security",
  test_embed: "security",
};
const ADMIN_ONLY = new Set([
  "ticket_deleted",
  "payment_approved",
  "payment_rejected",
  "license_activated",
  "license_rejected",
  "resource_created",
  "resource_compiled",
  "resource_protected",
  "coupon_created",
  "admin_action",
  "security_alert",
  "test_embed",
]);
const EVENT_TITLES: Record<string, string> = {
  user_registered: "Nuevo registro",
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  ticket_created: "Nuevo ticket de soporte",
  ticket_message: "Nuevo mensaje de soporte",
  ticket_deleted: "Ticket eliminado",
  order_created: "Nuevo pedido",
  free_product_claimed: "Nuevo reclamo de producto gratuito",
  payment_proof: "Comprobante recibido",
  payment_approved: "Pago aprobado",
  payment_rejected: "Pago rechazado",
  license_activated: "Licencia activada",
  license_rejected: "Activación de licencia rechazada",
  resource_created: "Producto publicado",
  resource_compiled: "Resource compilado",
  resource_protected: "Resource protegido y listo para publicar",
  coupon_created: "Nuevo cupón de descuento",
  review_created: "Nueva reseña publicada",
  review_updated: "Reseña actualizada",
  admin_action: "Acción administrativa",
  security_alert: "Alerta de seguridad",
  test_embed: "Prueba de conexión con Discord",
};
const EVENT_COLORS: Record<string, number> = {
  user_registered: 0x00C7FF, login: 0x00C7FF, logout: 0x64748B,
  ticket_created: 0x5865F2, ticket_message: 0x5865F2, ticket_deleted: 0x64748B,
  order_created: 0x3498DB, payment_proof: 0xF1C40F, payment_approved: 0x2ECC71, payment_rejected: 0xE74C3C,
  license_activated: 0x00C7FF, license_rejected: 0xE74C3C,
  resource_created: 0x00C7FF, resource_compiled: 0x8B5CF6, resource_protected: 0x14B8A6,
  coupon_created: 0xF59E0B, review_created: 0x00C7FF, review_updated: 0x8B5CF6,
  admin_action: 0x8B5CF6, security_alert: 0xEF4444,
  test_embed: 0x00C7FF,
};

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://dripxshop.vercel.app",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
}
function reply(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...cors(req),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
function safe(value: unknown, max = 300) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/@everyone|@here/gi, "@ everyone")
    .slice(0, max);
}
function uuid(value: unknown) {
  const text = String(value ?? "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}
function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}
async function rest(path: string, key: string, init: RequestInit = {}) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!base || !key) throw new Error("supabase_backend_not_configured");
  return await fetch(base + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: key,
      authorization: "Bearer " + key,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}
async function rows(path: string, serviceKey: string) {
  const response = await rest(path, serviceKey);
  if (!response.ok) throw new Error("database_lookup_failed");
  return asArray(await response.json());
}
async function isAdmin(base: string, anon: string, token: string) {
  const response = await fetch(base + "/rest/v1/rpc/dripx_is_admin", {
    method: "POST",
    headers: {
      apikey: anon,
      authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return false;
  return await response.json() === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });

  let stage = "initialize";
  try {
    stage = "load_environment";
    const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceKey = (() => {
      const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (legacy) return legacy;
      const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
          if (typeof parsed?.service_role === "string" && parsed.service_role) return parsed.service_role;
        } catch { /* legacy environment is preferred when available */ }
      }
      return "";
    })();
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!base || !anon || !serviceKey || !token) return reply(req, 401, { error: "authentication_required" });

    stage = "verify_user";
    const userResponse = await fetch(base + "/auth/v1/user", {
      headers: { apikey: anon, authorization: "Bearer " + token },
      signal: AbortSignal.timeout(7000),
    });
    if (!userResponse.ok) return reply(req, 401, { error: "invalid_session" });
    const user = await userResponse.json();
    if (!user?.id) return reply(req, 401, { error: "invalid_session" });
    stage = "verify_admin";
    const admin = await isAdmin(base, anon, token);

    stage = "parse_request";
    const raw = await req.text();
    if (raw.length > 240000) return reply(req, 413, { error: "request_too_large" });
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(req, 400, { error: "invalid_request" });
      body = parsed as Record<string, unknown>;
    } catch {
      return reply(req, 400, { error: "invalid_json" });
    }

    const event = safe(body.event, 60);
    let category = EVENT_CATEGORY[event];
    if (!category) return reply(req, 400, { error: "invalid_event" });
    if (ADMIN_ONLY.has(event) && !admin) return reply(req, 403, { error: "admin_required" });

    stage = "load_event_data";
    const details = body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? body.details as Record<string, unknown> : {};
    if (event === "test_embed") {
      const requestedCategory = safe(details.category, 30);
      if (!["security", "sales", "sales_public", "sales_private", "reviews", "coupons", "store", "support", "licenses"].includes(requestedCategory)) {
        return reply(req, 400, { error: "invalid_log_category" });
      }
      category = requestedCategory;
    }
    const orderId = uuid(details.order_id);
    const ticketId = uuid(details.ticket_id);
    let order: Record<string, unknown> | null = null;
    let ticket: Record<string, unknown> | null = null;
    let product: Record<string, unknown> | null = null;
    let review: Record<string, unknown> | null = null;
    let coupon: Record<string, unknown> | null = null;
    let couponImageBytes: Uint8Array | null = null;

    if (event.startsWith("order_") || event.startsWith("payment_")) {
      if (!orderId) return reply(req, 400, { error: "order_id_required" });
      const orderRows = await rows(
        "dripx_orders?id=eq." + encodeURIComponent(orderId) + "&select=id,user_id,status,total",
        serviceKey,
      );
      order = orderRows[0] || null;
      if (!order) return reply(req, 404, { error: "order_not_found" });
      if (!admin && order.user_id !== user.id) return reply(req, 403, { error: "not_order_owner" });
    }

    if (event.startsWith("ticket_")) {
      if (!ticketId) return reply(req, 400, { error: "ticket_id_required" });
      const ticketRows = await rows(
        "tickets?id=eq." + encodeURIComponent(ticketId) + "&select=id,user_id,subject,status,category",
        serviceKey,
      );
      ticket = ticketRows[0] || null;
      if (!ticket) return reply(req, 404, { error: "ticket_not_found" });
      if (!admin && ticket.user_id !== user.id) return reply(req, 403, { error: "not_ticket_owner" });
    }

    let productId = uuid(details.product_id);
    if (event === "review_created" || event === "review_updated") {
      const reviewId = uuid(details.review_id);
      if (!reviewId) return reply(req, 400, { error: "review_id_required" });
      const reviewRows = await rows(
        "dripx_reviews?id=eq." + encodeURIComponent(reviewId)
          + "&user_id=eq." + encodeURIComponent(user.id)
          + "&published=eq.true&select=id,product_id,rating,body,public_name,created_at&limit=1",
        serviceKey,
      );
      review = reviewRows[0] || null;
      if (!review) return reply(req, 404, { error: "published_review_not_found" });
      productId = uuid(review.product_id);
    }
    if (!productId && orderId && (event === "order_created" || event === "payment_approved" || event === "payment_rejected" || event === "payment_proof")) {
      const items = await rows(
        "dripx_order_items?order_id=eq." + encodeURIComponent(orderId) + "&select=product_id&limit=1",
        serviceKey,
      );
      productId = uuid(items[0]?.product_id);
    }
    if (event === "free_product_claimed") {
      if (!productId) return reply(req, 400, { error: "product_id_required" });
      const owned = await rows(
        "dripx_entitlements?user_id=eq." + encodeURIComponent(user.id) + "&product_id=eq." + encodeURIComponent(productId) + "&active=eq.true&select=id&limit=1",
        serviceKey,
      );
      if (!owned.length) return reply(req, 403, { error: "free_product_not_claimed" });
    }

    if (event === "coupon_created") {
      const couponId = uuid(details.coupon_id);
      const table = details.coupon_table === "coupon_codes" ? "coupon_codes" : "discount_coupons";
      if (!couponId || !admin) return reply(req, 403, { error: "coupon_admin_required" });
      const select = table === "coupon_codes"
        ? "id,code,discount_type,discount_value,currency,starts_at,expires_at,is_active,created_at"
        : "id,code,discount_type,discount_value,currency,starts_at,expires_at,active,created_at";
      const couponRows = await rows(table + "?id=eq." + encodeURIComponent(couponId) + "&select=" + select + "&limit=1", serviceKey);
      coupon = couponRows[0] || null;
      if (!coupon) return reply(req, 404, { error: "coupon_not_found" });
      const imageBase64 = typeof details.image_png_base64 === "string" ? details.image_png_base64 : "";
      if (imageBase64.length < 100 || imageBase64.length > 220000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
        return reply(req, 400, { error: "coupon_image_invalid" });
      }
      const binary = atob(imageBase64);
      couponImageBytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      if (couponImageBytes.length < 64 || couponImageBytes[0] !== 0x89 || couponImageBytes[1] !== 0x50 || couponImageBytes[2] !== 0x4e || couponImageBytes[3] !== 0x47) {
        return reply(req, 400, { error: "coupon_image_not_png" });
      }
    }

    if (productId) {
      const products = await rows(
        "dripx_products?id=eq." + encodeURIComponent(productId) + "&select=id,title,price_usd,category,image_path,image_url,status&limit=1",
        serviceKey,
      );
      product = products[0] || null;
      if (event === "free_product_claimed" && (!product || Number(product.price_usd) !== 0 || product.status !== "published")) {
        return reply(req, 403, { error: "product_not_free_or_published" });
      }
    }

    const destinations = event === "payment_approved"
      ? ["sales_public", "sales_private"]
      : [category];
    stage = "load_webhook_configuration";
    const destinationResults = await Promise.all(destinations.map(async destination => {
      const response = await rest("rpc/dripx_internal_get_discord_log_setting", serviceKey, {
        method: "POST",
        body: JSON.stringify({ p_category: destination }),
      });
      if (!response.ok) throw new Error("log_destination_lookup_failed");
      const data = await response.json();
      const setting = Array.isArray(data) ? data[0] : data;
      return { category: destination, enabled: setting?.enabled === true, webhook_url: String(setting?.webhook_url || "") };
    }));
    const configuredTargets = destinationResults.filter(target =>
      target.enabled && /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(target.webhook_url)
    );
    const missingDestinations = destinationResults.filter(target => !configuredTargets.some(active => active.category === target.category)).map(target => target.category);
    if (!configuredTargets.length) return reply(req, 200, { sent: false, reason: "not_configured", categories: destinations });

    let imageUrl = LOGO_URL;
    if (product?.image_path) {
      const path = String(product.image_path).split("/").map(encodeURIComponent).join("/");
      imageUrl = base + "/storage/v1/object/public/product-images/" + path;
    } else if (typeof product?.image_url === "string" && /^https:\/\//i.test(product.image_url)) {
      imageUrl = product.image_url;
    }

    const displayName = safe(
      user.user_metadata?.global_name || user.user_metadata?.full_name || user.user_metadata?.name || "Cliente",
      120,
    );
    const publicProfileRows = await rows(
      "dripx_profiles?user_id=eq." + encodeURIComponent(user.id) + "&select=display_name,leaderboard_public&limit=1",
      serviceKey,
    );
    const publicProfile = publicProfileRows[0] || null;
    const publicBuyerName = publicProfile?.leaderboard_public === true
      ? safe(publicProfile.display_name || displayName, 120)
      : "Cliente verificado";
    const discordIdentity = Array.isArray(user.identities)
      ? user.identities.find((identity: Record<string, unknown>) => identity.provider === "discord")
      : null;
    const discordId = safe(
      discordIdentity?.identity_data?.provider_id || discordIdentity?.identity_data?.sub || "No disponible",
      40,
    );

    const fields: Array<Record<string, unknown>> = [
      { name: "Usuario", value: displayName || "Cliente", inline: true },
      { name: "Discord ID", value: discordId, inline: true },
    ];
    if (order) {
      fields.push({ name: "Pedido", value: String(order.id).slice(0, 8).toUpperCase(), inline: true });
      fields.push({ name: "Estado", value: safe(order.status, 40), inline: true });
      fields.push({ name: "Total", value: "$" + Number(order.total || 0).toFixed(2), inline: true });
    }
    if (ticket) {
      fields.push({ name: "Ticket", value: safe(ticket.subject, 180) || String(ticket.id).slice(0, 8), inline: false });
      fields.push({ name: "Estado", value: safe(ticket.status, 40), inline: true });
    }
    if (coupon) {
      fields.push({ name: "Cupón", value: safe(coupon.code, 80) || "Nuevo cupón", inline: true });
      fields.push({ name: "Descuento", value: safe(coupon.discount_value, 30) + (["percent","percentage","percent_off"].includes(String(coupon.discount_type || "").toLowerCase()) ? "%" : " " + safe(coupon.currency || "USD", 8)), inline: true });
      fields.push({ name: "Vigencia", value: safe(coupon.expires_at || coupon.created_at, 60) || "Sin fecha", inline: true });
    }
    if (product) {
      fields.push({ name: "Producto", value: safe(product.title, 180), inline: false });
      fields.push({ name: "Precio", value: "$" + Number(product.price_usd || 0).toFixed(2), inline: true });
      fields.push({ name: "Categoría", value: safe(product.category, 80) || "MTA:SA", inline: true });
    }
    if (review) {
      fields.push({ name: "Valoración", value: String(review.rating) + "/5", inline: true });
      fields.push({ name: "Opinión", value: safe(review.body, 900) || "—", inline: false });
      fields.push({ name: "Autor", value: review.public_name === true ? displayName : "Cliente verificado", inline: true });
    }
    if (event === "test_embed") {
      fields.push({ name: "Resultado", value: "Webhook y payload embed aceptados", inline: false });
      fields.push({ name: "Canal lógico", value: category, inline: true });
    }
    if (event === "resource_protected") {
      const filename = safe(details.filename || details.source_filename, 160) || "resource-DRIPX-protegido.zip";
      fields.push({ name: "ZIP protegido", value: filename, inline: false });
      fields.push({ name: "Archivos", value: safe(details.file_count, 20) || "—", inline: true });
      fields.push({ name: "Lua servidor", value: safe(details.server_lua_count, 20) || "—", inline: true });
      fields.push({ name: "Lua cliente", value: safe(details.client_lua_count, 20) || "—", inline: true });
      fields.push({ name: "Tamaño original", value: safe(details.source_bytes, 30) + " bytes", inline: true });
      fields.push({ name: "Tamaño protegido", value: safe(details.protected_bytes, 30) + " bytes", inline: true });
    }

    const productUrl = product
      ? "https://dripxshop.vercel.app/#producto/" + encodeURIComponent(String(product.id))
      : "https://dripxshop.vercel.app";
    const purchaseButton = product && (event === "payment_approved" || event === "order_created")
      ? [{ type: 1, components: [{ type: 2, style: 5, label: "Comprar", url: productUrl }] }]
      : undefined;
    const sentDestinations: Array<{ category: string; message_id: string | null }> = [];
    stage = "send_discord_embed";
    for (const target of configuredTargets) {
      const targetFields = target.category === "sales_public"
        ? [
            { name: "Comprador", value: publicBuyerName, inline: true },
            ...fields.filter(field => ["Producto", "Precio", "Categoría", "Total"].includes(String(field.name))),
          ]
        : fields;
      const embed = {
        title: EVENT_TITLES[event] || "Actividad DRIP X SHOP",
        description: target.category === "sales_public"
          ? "Venta confirmada en DRIP X SHOP."
          : event === "test_embed"
            ? "La conexión de DRIP X SHOP con Discord funciona. Este mensaje confirma que el webhook acepta embeds."
            : event === "free_product_claimed"
              ? "Un cliente obtuvo un producto gratuito de DRIP X SHOP."
              : event === "payment_approved"
                ? "El pago fue aprobado y el acceso correspondiente quedó habilitado."
                : event === "order_created"
                  ? "Se creó un nuevo pedido en la tienda."
                  : event === "resource_protected"
                    ? "El ZIP del producto terminó el análisis, la protección y la compilación DRIPX antes de publicarse."
                    : event.startsWith("review_")
                      ? "Un cliente verificado publicó una valoración de producto."
                      : product
                        ? "Actividad registrada para un producto de la tienda."
                        : "Actividad registrada en DRIP X SHOP.",
        color: EVENT_COLORS[event] || 0x00C7FF,
        author: { name: "DRIP X SHOP", icon_url: LOGO_URL },
        fields: targetFields,
        thumbnail: { url: LOGO_URL },
        url: product ? productUrl : "https://dripxshop.vercel.app",
        image: { url: event === "coupon_created" ? "attachment://dripx-coupon.png" : (product ? imageUrl : LOGO_URL) },
        timestamp: new Date().toISOString(),
        footer: { text: "DRIP X SHOP · " + target.category },
      };
      const webhookTarget = new URL(target.webhook_url);
      webhookTarget.searchParams.set("wait", "true");
      let discordResponse: Response;
      const payload = {
        username: "DRIP X SHOP · Logs",
        allowed_mentions: { parse: [] },
        embeds: [embed],
        ...(purchaseButton ? { components: purchaseButton } : {}),
      };
      if (event === "coupon_created" && couponImageBytes) {
        const form = new FormData();
        form.set("payload_json", JSON.stringify(payload));
        form.set("files[0]", new Blob([couponImageBytes], { type: "image/png" }), "dripx-coupon.png");
        discordResponse = await fetch(webhookTarget.toString(), {
          method: "POST", body: form, signal: AbortSignal.timeout(12000),
        });
      } else {
        discordResponse = await fetch(webhookTarget.toString(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(9000),
        });
      }
      if (!discordResponse.ok) {
        console.error("[dripx-discord-logs] discord_rejected category=" + target.category + " status=" + discordResponse.status);
        return reply(req, 502, { sent: false, reason: "discord_webhook_rejected", category: target.category, discord_status: discordResponse.status, sent_categories: sentDestinations.map(item => item.category) });
      }
      const sentMessage = await discordResponse.clone().json().catch(() => null);
      if (!sentMessage || !Array.isArray(sentMessage.embeds) || sentMessage.embeds.length === 0) {
        console.error("[dripx-discord-logs] discord_embed_not_confirmed category=" + target.category);
        return reply(req, 502, { sent: false, reason: "discord_embed_not_confirmed", category: target.category });
      }
      sentDestinations.push({ category: target.category, message_id: String(sentMessage.id || "") || null });
    }
    return reply(req, 200, {
      sent: sentDestinations.length > 0,
      destinations: sentDestinations,
      missing_destinations: missingDestinations,
      partial: missingDestinations.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[dripx-discord-logs] stage=" + stage + " reason=" + message.slice(0, 220));
    return reply(req, 503, { error: "discord_log_service_unavailable", stage });
  }
});
