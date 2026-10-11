# Parche 10 — Perfil del cliente + bloqueo de solicitudes activas

## Perfil del cliente
- Agrega un resumen de actividad con solicitudes activas, trabajos completados y proveedores favoritos.
- Agrega una sección de seguridad y cuenta con estado, verificación de correo y fecha de registro cuando esté disponible.
- Agrega un botón para solicitar cambio de contraseña mediante Firebase Authentication.
- Mejora la etiqueta de correo para no afirmar que está verificado si Firebase todavía no lo confirma.

## Solicitar servicio
- Si el cliente ya tiene una solicitud `solicitada`, `aceptada` o `en_proceso` con ese proveedor, el botón queda bloqueado.
- El botón muestra el estado actual: `Solicitud pendiente`, `Servicio aceptado` o `Trabajo en proceso`.
- Cuando la solicitud pasa a `completada`, `cancelada` o `rechazada`, el botón se habilita nuevamente automáticamente mediante escucha en tiempo real de Firestore.
- `databaseService` también impide crear una segunda solicitud activa con el mismo proveedor, incluso si se intenta saltar la interfaz.

## Instalación
Reemplazar:
- `src/components/TabPerfil.tsx`
- `src/components/TabInicio.tsx`
- `src/state/databaseService.ts`

No cambia `firestore.rules`.

Ejecutar:
```powershell
npm run build
npx cap sync android
```
