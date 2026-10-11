# Parche 09F — re-verificación y acceso público

## Correcciones

- La re-solicitud de verificación ya no elimina campos ni revalida todo el perfil del proveedor.
- El proveedor solo cambia `verificado`, `estado_verificacion`, `verificacion_solicitada_at` y limpia la observación.
- La regla permite volver a `pendiente` desde `sin_solicitar` o `rechazado`.
- Un visitante sin iniciar sesión puede buscar proveedores y abrir sus perfiles.
- Los botones **Llamar** y **WhatsApp** solo aparecen para cuentas autenticadas de tipo `cliente`.
- En el perfil público se muestra un texto discreto invitando a iniciar sesión para contactar.

## Archivos

- `firestore.rules`
- `src/state/databaseService.ts`
- `src/components/TabInicio.tsx`

## Aplicación

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```
