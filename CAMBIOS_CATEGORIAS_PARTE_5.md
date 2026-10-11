# Servicios Vecinales — Parche 05: Categorías

Este parche se aplica sobre la versión 7 que ya tiene instalados los parches anteriores.

## Qué agrega

- 20 categorías de servicios.
- Cada proveedor puede seleccionar entre 1 y 5 categorías.
- La primera categoría seleccionada funciona como categoría principal para mantener compatibilidad con los datos anteriores.
- Los clientes pueden filtrar proveedores por cualquiera de sus categorías.
- El buscador también reconoce el nombre de las categorías.
- Las categorías aparecen como etiquetas en las tarjetas y en el perfil completo del proveedor.
- Los proveedores antiguos siguen funcionando: si no tienen el nuevo campo `categorias`, se usa automáticamente su `categoria_id` existente.

## Categorías incluidas

Electricidad, Gasfitería, Cerrajería, Carpintería, Pintura, Construcción, Climatización, Limpieza, Jardinería, Informática, Desarrollo web, Electrodomésticos, Mecánica, Fletes y mudanzas, Mascotas, Belleza, Clases particulares, Fotografía y eventos, Costura y arreglos, Otros.

## Archivos a reemplazar

- `src/types.ts`
- `src/constants.ts`
- `src/state/databaseService.ts`
- `src/components/TabInicio.tsx`
- `src/components/TabPerfil.tsx`
- `firestore.rules`

## Después de copiar el parche

Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Luego abre Android Studio y ejecuta la app con **Run**.

## Importante

`npm run firebase:rules` es obligatorio porque Firestore debe permitir el nuevo campo `categorias` y las nuevas categorías.

No es necesario volver a ejecutar `npx cap add android` ni modificar JDK, Gradle, SDK o `local.properties`.
