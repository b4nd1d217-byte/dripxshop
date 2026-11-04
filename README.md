# DRIP X SHOP

Tienda digital de productos y planes para MTA:SA, servida como sitio estático en Vercel y conectada a Supabase.

## Estructura
- `index.html`: shell de la aplicación.
- `app.js`: catálogo, autenticación Discord, carrito, pedidos, cuenta, licencias, descargas y panel administrativo.
- `styles.css`: interfaz oscura premium con acento cian `#00C7FF`.
- `config.js`: URL, clave pública de Supabase y Discord ID propietario.
- `assets/logo.svg`: marca e icono.
- `vercel.json`: encabezados de seguridad.
- `supabase/migrations`: migraciones SQL.

La autenticación es Discord mediante Supabase. La identidad del propietario se valida con `auth.identities`; no se confía en metadatos editables. `dripx_is_admin()` permanece restringida a usuarios autenticados y service role. Los visitantes anónimos solo pueden leer el catálogo publicado, sin ejecutar la función de administración.

El frontend utiliza exclusivamente la clave pública de Supabase. Ninguna clave service-role, token de bot o webhook se incluye en los archivos del navegador. Las descargas y comprobantes permanecen privados y se sirven con control de acceso y enlaces firmados.

Funciones incluidas: catálogo USD de recursos y planes MTA:SA; filtros; carrito; pedidos; envío de comprobantes PDF/imagen; aprobación manual sin comprobante por administración; facturas y descargas personalizadas con clave DRIPX; licencias y servidor IP/puerto; tickets y mensajes; reseñas verificadas; Top 3 anónimo por defecto; administración de productos, planes, categorías, reseñas, roles, usuarios, transferencias y tickets; destinos privados configurables de logs Discord.

La configuración de webhooks se guarda en el esquema privado de Supabase. Su ejecución requiere el consumidor/servicio de logs correspondiente; las URL no se exponen al frontend del cliente.

La protección ZIP analiza meta.xml, deja intactos shaders y scripts client/shared y protege únicamente Lua server-side seleccionados. Ningún bytecode distribuido puede garantizarse como imposible de descompilar o modificar: el control de licencia y la validación remota son la protección principal.

Comprobaciones: `node --check app.js` y `node --check config.js`. Antes de considerar el sistema plenamente validado hay que hacer E2E con login Discord real, comprobante, aprobación, descarga personalizada y servidor MTA:SA de prueba.