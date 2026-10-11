# Parche 02 — Historial organizado

Este parche se aplica sobre Servicios Vecinales v7 (con el parche de Favoritos si ya fue aplicado).

## Cambios

- La pestaña Solicitudes ahora se divide en tres vistas:
  - Activas: solicitada, aceptada y en proceso.
  - Completadas: trabajos terminados.
  - Cerradas: solicitudes canceladas o rechazadas.
- Cada vista muestra un contador.
- Los trabajos completados mantienen el botón de reseña opcional.
- Las solicitudes canceladas/rechazadas ya no se mezclan con los trabajos activos.
- Se agregaron estados vacíos específicos para cada sección.
- No requiere cambios de Firestore, Firebase Rules, Android, Gradle ni Capacitor.

## Archivos a reemplazar

- `src/components/TabSolicitudes.tsx`

## Después de copiar el archivo

Desde la raíz del proyecto:

```powershell
npm run build
npx cap sync android
```

Luego abre Android Studio y ejecuta la aplicación con Run.
