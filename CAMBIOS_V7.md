# Servicios Vecinales v7 — Notificaciones dentro de la app

## Qué se agregó

- Nueva pestaña **Avisos** para clientes y proveedores.
- Contador rojo de notificaciones no leídas en la navegación inferior.
- Actualización en tiempo real con Firestore mediante `onSnapshot`.
- Filtros **Todas** y **No leídas**.
- Acción **Leer todas**.
- Al tocar una notificación se marca como leída y abre la pestaña **Solicitudes**.

## Cuándo se genera una notificación

### Para el proveedor
- Cuando un cliente envía una nueva solicitud.
- Cuando un cliente cancela una solicitud.
- Cuando un cliente publica una reseña de un trabajo completado.

### Para el cliente
- Cuando el proveedor acepta la solicitud.
- Cuando el proveedor rechaza la solicitud.
- Cuando el trabajo pasa a **En proceso**.
- Cuando el trabajo se marca como **Completado**.
- Cuando el proveedor cancela una solicitud.

## Seguridad

Las notificaciones se guardan en:

`usuarios/{uid}/notificaciones/{notificacionId}`

Las reglas permiten que cada usuario lea y marque como leídas únicamente sus propias notificaciones. La creación de avisos está vinculada a una solicitud real y a una transición de estado válida. Las reseñas solo pueden generar avisos cuando están asociadas a un trabajo completado.

## Importante antes de probar

Esta versión modifica `firestore.rules`. Debes publicar las reglas nuevas antes de usar el flujo de solicitudes:

```bash
npm run firebase:rules
```

Si no publicas las reglas v7, la creación/cambio de solicitudes puede ser rechazada porque ahora la solicitud y su notificación se guardan de manera atómica.
