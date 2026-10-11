# Parche 07B — Push ocultas + aviso interno de chat

Este parche se aplica sobre la versión 7 con los parches anteriores, incluido el parche 07 de notificaciones push.

## Cambios

- Se oculta de `Mi perfil` toda la sección visual de notificaciones push.
- No se elimina la preparación técnica de FCM para poder retomarla más adelante cuando el proyecto use Blaze.
- Cada mensaje de chat crea, en la misma escritura atómica, una notificación interna para la otra persona de la solicitud.
- El aviso aparece en la pestaña `Avisos` con tipo `Nuevo mensaje` y el contador de no leídos se actualiza en tiempo real.
- Si la app está cerrada, el aviso queda guardado en Firestore y aparecerá al volver a abrirla.
- Las notificaciones push del sistema Android siguen sin enviarse mientras Cloud Functions no pueda desplegarse en Spark.
- Se retira del código futuro de Functions el trigger que duplicaría el aviso de chat; cuando se reactive Blaze, el aviso interno creado por la app podrá ser usado por `onUserNotificationCreated` para enviar la push.

## Archivos a reemplazar

- `src/components/TabPerfil.tsx`
- `src/state/databaseService.ts`
- `firestore.rules`
- `functions/src/index.ts`

## Instalación

Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Luego abrir Android Studio y ejecutar `Run`.

No ejecutar `firebase:functions` mientras el proyecto siga en Spark.

## Prueba recomendada

1. Iniciar sesión como cliente en un dispositivo/navegador.
2. Iniciar sesión como proveedor en otro.
3. Abrir una solicitud y enviar un mensaje desde el chat.
4. En la cuenta receptora debe aumentar el contador de `Avisos`.
5. Dentro de `Avisos` debe aparecer `Nuevo mensaje de ...` con el texto recibido.
6. Al tocar el aviso, debe abrir `Solicitudes`.
