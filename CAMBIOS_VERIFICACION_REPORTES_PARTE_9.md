# Parche 09 — Verificación de proveedores y reportes

## Verificación
- El proveedor puede solicitar una revisión desde Mi perfil.
- Estados: sin solicitar, pendiente, verificado y rechazado.
- Administración ve las solicitudes pendientes y puede aprobar/rechazar con observación.
- Administración también puede retirar una verificación.
- La insignia existente se mantiene visible para clientes.
- La verificación se describe como revisión administrativa; no sustituye licencias ni certificaciones profesionales.

## Reportes
- El cliente puede reportar un proveedor desde su perfil.
- El cliente puede reportar una reseña concreta.
- Motivos: conducta inadecuada, información falsa, contenido inapropiado, spam u otro.
- Un usuario solo puede crear un reporte por el mismo objetivo.
- Los reportes son privados y solo los ve administración.
- Administración puede marcar un reporte como Revisado o Descartado.

## Archivos
- src/types.ts
- src/state/databaseService.ts
- src/components/TabPerfil.tsx
- src/components/TabInicio.tsx
- src/components/TabAdmin.tsx
- firestore.rules

## Aplicación
1. Reemplazar los archivos del parche.
2. Ejecutar `npm run firebase:rules`.
3. Ejecutar `npm run build`.
4. Ejecutar `npx cap sync android`.
5. Abrir Android Studio con `npx cap open android` y ejecutar la app.

No requiere Cloud Functions, Blaze, cambios de JDK, Gradle, SDK ni `npx cap add android`.
