# Parche 03 — Detalle de solicitud

Aplicar sobre Servicios Vecinales v7 con los parches anteriores.

## Incluye

- Al tocar una tarjeta de solicitud se abre una vista completa de detalle.
- En detalle se muestran proveedor/cliente, oficio, descripción, ubicación, teléfonos, estado, fecha de creación y última actualización.
- La barra inferior se oculta mientras el detalle está abierto.
- Las acciones de estado se mantienen disponibles dentro del detalle.
- La reseña opcional de trabajos completados se gestiona desde el detalle.
- Se agrega un historial de estados por solicitud en Firestore.
- Las solicitudes nuevas registran el estado `solicitada` desde su creación.
- Cada cambio posterior registra actor, rol, estado y fecha mediante `serverTimestamp()`.
- Solicitudes creadas antes del parche muestran un historial reconstruido con los datos disponibles.

## Nueva estructura Firestore

```text
solicitudes/{solicitudId}/historial/{estado}
  id
  estado
  actor_id
  actor_rol
  fecha
```

## Archivos modificados

- `src/App.tsx`
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

Luego abrir/volver a Android Studio y ejecutar con Run.

No ejecutar `npx cap add android` y no cambiar JDK, SDK, Gradle ni `local.properties`.
