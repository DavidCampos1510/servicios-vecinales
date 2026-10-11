# Parche 09D — Reportes y moderación administrativa

Este parche se aplica sobre la versión 7 acumulada con los parches anteriores.

## Qué corrige

### Reportes
- Corrige definitivamente el `permission-denied` al reportar un proveedor.
- La app ya no consulta previamente un documento de reporte inexistente.
- Cada reporte usa un ID nuevo generado por Firestore y se valida directamente al crearse.
- Un cliente puede reportar un proveedor o una reseña.
- Un proveedor puede reportar al cliente desde el detalle de una solicitud asociada.
- Los reportes solo pueden ser listados por un administrador.

### Verificación
- Si la verificación se aprueba, desaparece la sección visual de “Solicitar verificación” del perfil del proveedor.
- Se mantiene únicamente la insignia de proveedor verificado.
- Al aprobar o rechazar, el proveedor recibe un aviso interno.
- Si se rechaza, la sección de verificación sigue visible y permite solicitar una nueva revisión.

### Moderación de cuentas
- El panel administrador muestra clientes y proveedores.
- Se muestra la cantidad de reportes asociados a cada cuenta.
- El administrador puede:
  - suspender una cuenta;
  - reactivarla;
  - eliminarla de la aplicación.
- Una cuenta suspendida o eliminada no puede iniciar sesión.
- Si una cuenta ya estaba abierta y el administrador la suspende/elimina, la app escucha el cambio y cierra su sesión.
- Si es proveedor y se suspende/elimina, su perfil deja de aparecer en la búsqueda de clientes.

## Importante: Firebase Authentication

“Eliminar de la aplicación” bloquea la cuenta dentro de Servicios Vecinales y oculta el proveedor, pero no borra físicamente el usuario de Firebase Authentication.

Borrar otra cuenta de Firebase Authentication de forma segura requiere Firebase Admin SDK en un entorno de servidor. Mientras el proyecto continúe en Spark, la eliminación física se puede hacer manualmente desde Firebase Console > Authentication > Users después de eliminarla de la app.

## Archivos a reemplazar

- `src/App.tsx`
- `src/components/TabAdmin.tsx`
- `src/components/TabInicio.tsx`
- `src/components/TabPerfil.tsx`
- `src/components/TabSolicitudes.tsx`
- `src/components/TabNotificaciones.tsx`
- `src/state/databaseService.ts`
- `src/types.ts`
- `firestore.rules`

## Aplicación del parche

Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Para abrir Android Studio:

```powershell
npx cap open android
```

## Pruebas recomendadas

1. Cliente: reportar un proveedor.
2. Cliente: reportar una reseña.
3. Proveedor: abrir una solicitud y reportar al cliente.
4. Admin: comprobar que los tres reportes aparezcan.
5. Admin: suspender una cuenta y comprobar que no pueda iniciar sesión.
6. Admin: reactivar la cuenta.
7. Admin: eliminar de la app a un proveedor y comprobar que desaparezca del buscador.
8. Verificación: aprobar proveedor, comprobar aviso interno y que desaparezca la sección de solicitud de verificación.
9. Verificación: rechazar proveedor y comprobar aviso interno y que se permita solicitar nuevamente.
