# Parche 17B — Corrección acumulativa 16B + 17

Este parche corrige una omisión del parche 17.

## Archivos agregados
- `src/components/PrivacyRightsCenter.tsx`
- `src/components/TabAdmin.tsx`

`PrivacyRightsCenter.tsx` era importado por `TabPerfil.tsx` del parche 17 pero no había sido incluido en el ZIP.
`TabAdmin.tsx` corresponde a la sección administrativa de privacidad agregada en el parche 16B y también debía mantenerse al indicar que el parche 17 era acumulativo.

## Aplicación
Copiar ambos archivos respetando la ruta `src/components/` y luego ejecutar:

```powershell
npm run build
npx cap sync android
```

No requiere volver a publicar reglas de Firestore si ya se publicó `firestore.rules` del parche 17.
