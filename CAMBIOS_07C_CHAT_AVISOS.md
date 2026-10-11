# Parche 07C — Chat y Avisos

Este parche se aplica sobre Servicios Vecinales v7 con los parches anteriores.

## Cambios

1. Corrige el aviso interno de chat en ambos sentidos (cliente → proveedor y proveedor → cliente).
2. El mensaje se guarda primero y después se genera el aviso interno usando el mensaje existente como validación.
3. Al tocar un aviso de tipo "Nuevo mensaje", la app abre directamente el chat de esa solicitud.
4. Se agrega "Borrar leídas" en Avisos.
5. Solo las notificaciones ya leídas se pueden borrar. Las no leídas se conservan.
6. Se mantiene el botón "Leer todas".

## Archivos a reemplazar

- src/App.tsx
- src/components/TabNotificaciones.tsx
- src/components/TabSolicitudes.tsx
- src/state/databaseService.ts
- firestore.rules

## Después de copiar

Ejecutar desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Luego ejecutar nuevamente la app desde Android Studio.

No es necesario desplegar Cloud Functions ni usar Blaze para este parche.
