# Parte 6 — Chat cliente ↔ proveedor

Este parche se aplica sobre la versión 7 con los parches 01 a 05 ya incorporados.

## Qué agrega

- Chat en tiempo real dentro de cada solicitud.
- El chat se abre desde `Solicitudes > Ver detalle > Abrir chat`.
- Los mensajes quedan asociados al trabajo correspondiente.
- Cliente y proveedor reciben los nuevos mensajes sin recargar la pantalla.
- Los mensajes guardan remitente, rol, texto y fecha.
- Máximo de 1000 caracteres por mensaje.
- En solicitudes `rechazada` o `cancelada`, el historial se conserva pero el chat queda en solo lectura.
- Administradores no participan del chat.
- El modo local también mantiene una conversación simulada.

## Estructura en Firestore

`solicitudes/{solicitudId}/mensajes/{mensajeId}`

Cada mensaje contiene:

- `id`
- `solicitud_id`
- `remitente_id`
- `remitente_nombre`
- `remitente_rol`
- `texto`
- `createdAt`

## Seguridad

Las reglas permiten leer el chat solamente al cliente y proveedor vinculados a la solicitud (y al administrador para lectura). Solamente cliente o proveedor pueden crear mensajes y no pueden editar ni eliminar mensajes ya enviados.

## Archivos a reemplazar

- `src/components/TabSolicitudes.tsx`
- `src/state/databaseService.ts`
- `src/types.ts`
- `firestore.rules`

## Después de copiar el parche

Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Luego abre Android Studio y ejecuta la app con Run.

No ejecutes `npx cap add android` y no modifiques JDK, Gradle, SDK o `local.properties`.

## Próxima etapa

Notificaciones push con Firebase Cloud Messaging. En esa etapa podremos avisar en el teléfono cuando llegue un mensaje o cambie el estado de una solicitud, incluso si la app está cerrada.
