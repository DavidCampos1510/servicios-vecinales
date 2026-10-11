# Parche 15 — Perfil de proveedor organizado y estadísticas

## Cambios
- El perfil profesional deja de mostrar todas sus secciones una debajo de otra.
- Se agregan cuatro pestañas internas: Perfil, Agenda, Trabajos y Estadísticas.
- Se mantiene la edición del perfil, verificación, agenda semanal, portafolio y reseñas.
- Estadísticas nuevas: solicitudes recibidas, trabajos completados, clientes atendidos, calificación promedio, solicitudes activas y tasa de aceptación.
- La tasa de aceptación considera solicitudes aceptadas/en proceso/completadas frente a rechazadas. Pendientes y canceladas no afectan el porcentaje.
- No modifica Firestore Rules ni Android.

## Instalación
Reemplazar `src/components/TabPerfil.tsx` y ejecutar:

```powershell
npm run build
npx cap sync android
```
