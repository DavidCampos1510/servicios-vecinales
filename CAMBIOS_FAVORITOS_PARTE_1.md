# Parche 1 — Favoritos

Archivos modificados:

- `src/components/TabInicio.tsx`
- `src/state/databaseService.ts`
- `firestore.rules`

## Qué agrega

- Corazón para guardar/quitar proveedores favoritos.
- Botón **Mis favoritos** con contador.
- Filtro que muestra solo los proveedores guardados.
- Corazón también disponible dentro del detalle del proveedor.
- Favoritos persistentes por usuario en Firestore: `usuarios/{uid}/favoritos/{proveedorId}`.
- Soporte equivalente en modo local.

## Importante

Este parche cambia reglas de Firestore. Después de copiar los archivos ejecuta:

```bash
npm run firebase:rules
```

Luego actualiza Android con:

```bash
npm run build
npx cap sync android
```

No ejecutes `npx cap add android` y no cambies JDK, Gradle, SDK ni `local.properties`.
