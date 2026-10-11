# Parche 11 — Fotos de perfil locales

## Qué agrega

- Cliente: puede seleccionar una foto desde galería/cámara en **Mi perfil**.
- Proveedor: puede usar una foto local en **Mi perfil** sin Firebase Storage.
- La imagen se recorta al centro, se redimensiona a 320×320 y se comprime a JPEG antes de guardarse.
- Se guarda en `localStorage` usando el UID del usuario como clave.
- Se puede reemplazar o quitar la foto.
- En el mismo dispositivo, la foto local del proveedor también se usa en las tarjetas y en el detalle del proveedor.
- Si no existe una foto local, la app usa la imagen pública/fallback que ya tenía el proveedor.

## Importante

Una foto guardada localmente **no se sincroniza** con otros celulares, computadores o navegadores. También puede perderse si se borran los datos de la app/navegador o se desinstala la aplicación.

Por este motivo, la foto local del proveedor solo puede verse en los dispositivos donde esa foto haya sido guardada. Para una foto pública sincronizada entre todos los usuarios se necesitará en el futuro Firebase Storage u otro alojamiento de imágenes.

## Archivos

- `src/components/TabPerfil.tsx`
- `src/components/TabInicio.tsx`
- `src/state/localProfilePhoto.ts` (nuevo)

## Aplicación

No modifica Firestore ni sus reglas.

```powershell
npm run build
npx cap sync android
npx cap open android
```
