# Parche 09C — Corrección de permisos al reportar

## Problema corregido
La aplicación comprobaba si ya existía un reporte mediante `getDoc()` antes de crearlo. Las reglas de Firestore permitían leer la colección `reportes` únicamente al administrador, por lo que un cliente/proveedor recibía `permission-denied` antes de que el reporte pudiera guardarse.

## Corrección
- El administrador mantiene acceso de lectura a todos los reportes.
- El usuario que creó un reporte puede leer únicamente su propio documento individual.
- Los usuarios normales no pueden listar la colección `reportes` ni consultar reportes ajenos.
- La creación, actualización administrativa y demás validaciones permanecen sin cambios.

## Instalación
Reemplazar solamente `firestore.rules` y ejecutar:

```powershell
npm run firebase:rules
```

No es necesario ejecutar `npm run build` ni `npx cap sync android`, porque este parche solo modifica reglas del servidor.
