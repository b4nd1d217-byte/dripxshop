# DRIP X SHOP

Tienda digital de recursos y planes para MTA:SA. Interfaz premium oscura, USD, autenticación exclusiva con Discord mediante Supabase.

## Estructura
- `index.html`: shell del sitio.
- `app.js`: aplicación cliente (reconstruida durante el build desde los fragmentos Brotli).
- `styles.css`: estilos (reconstruidos durante el build desde gzip).
- `config.js`: configuración pública de Supabase y Discord ID del propietario.
- `assets/logo.svg`: logo transparente seleccionado, usado en cabecera, portada y favicon.
- `assets/dripx-logo.webp`: versión optimizada del logo para imágenes de Discord.
- `build.mjs`: build estático de Vercel.
- `supabase/migrations`: cambios de base de datos.

## Seguridad
La tienda solo usa la clave publicable de Supabase en el navegador. La clave service-role nunca se distribuye al cliente. `dripx_is_admin()` se mantiene restringida a usuarios autenticados y service role; las políticas del catálogo público no invocan esa función para `anon`. Comprobantes y descargas se mantienen en buckets privados y se sirven con URLs firmadas.

La cuenta del propietario se vincula mediante el Discord ID configurado y la identidad Discord de Supabase; no se usa una clave maestra incrustada en la web.

## Funciones
Catálogo de productos/planes MTA:SA en USD, búsqueda y filtros, carrito, pedidos, comprobantes PDF/imagen, facturas, licencias DRIPX, IP/puerto, descargas, tickets y mensajes, reseñas verificadas, ranking de compradores, administración de productos/categorías/usuarios/roles, asignación/transferencia de accesos y administración de tickets.

Los destinos de cinco tipos de logs de Discord se guardan en el esquema privado de Supabase y sólo pueden ser editados por administración. El cliente emite eventos confirmados a la Edge Function `dripx-discord-logs`; el worker valida la sesión, la propiedad del pedido/ticket y los permisos administrativos antes de consultar el webhook privado. Los eventos de producto muestran su imagen; el resto usa el logo DRIP X SHOP. Los webhooks nunca se exponen al navegador. Los cinco destinos deben configurarse y habilitarse en Administración > Logs.

Stripe permanece deliberadamente fuera del flujo de compra actual.

## Build y validación
`node build.mjs` genera `dist/`. Comprobaciones locales previas: `node --check app.js`, `node --check config.js` y parseo HTML. El build valida sintaxis de `app.js`, `auth-bootstrap.js` y `dripx-enhancements.js`. Aún falta una prueba E2E interactiva con OAuth Discord real, comprobante, aprobación, descarga y servidor MTA:SA de pruebas antes de certificar toda la operación.
