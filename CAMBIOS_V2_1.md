# Cambios v2.1

- Corregida la compresión de la tarjeta superior del proveedor en móvil.
- Foto y datos del proveedor visibles en el detalle.
- Nombre público de proveedor agregado de forma compatible con perfiles existentes.
- Migración automática del nombre público al iniciar sesión como proveedor.
- Teléfono editable y validado al crear solicitudes.
- Validación entre UID autenticado y perfil activo.
- Errores reales de Firebase preservados y traducidos a mensajes útiles.
- Reglas de solicitudes y reseñas ajustadas.
- Pantalla Solicitudes con reintento y estado de error independiente.
- Script de comprobación de Firebase: `npm run firebase:check`.
- Despliegue seguro de reglas al proyecto indicado en `.env`: `npm run firebase:rules`.
