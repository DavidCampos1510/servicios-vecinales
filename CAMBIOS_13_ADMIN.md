# Parche 13 — Panel administrador: estadísticas, ranking, auditoría y CSV

## Cambios principales

- Filtro de estadísticas: Hoy, 7 días, 30 días y Todo.
- Resumen por período: solicitudes creadas, trabajos completados, activas y reportes recibidos.
- Gráfico horizontal de solicitudes por estado.
- Ranking de los 5 proveedores con más trabajos completados en el período, usando la fecha de finalización (`updatedAt`).
- Nueva colección Firestore `auditoria_admin` para registrar acciones administrativas.
- Se registran nuevas acciones de:
  - aprobación/rechazo/retiro de verificación;
  - revisión/descarte de reportes;
  - suspensión/reactivación/eliminación lógica de cuentas;
  - aprobación/rechazo de apelaciones.
- El panel muestra las 10 acciones administrativas más recientes y conserva hasta 50 en la consulta.
- Exportación CSV compatible con Excel para:
  - usuarios;
  - solicitudes;
  - reportes;
  - auditoría administrativa.
- El panel continúa cargando aunque la colección de auditoría todavía no tenga datos.

## Archivos a reemplazar

- `src/components/TabAdmin.tsx`
- `src/state/databaseService.ts`
- `firestore.rules`

## Firestore

Se agrega la colección:

```text
auditoria_admin/{id}
  id
  admin_id
  admin_nombre
  accion
  objetivo_id
  objetivo_nombre
  detalle
  createdAt
```

Solo una cuenta con rol `admin` puede crear y leer estos registros. Los registros no se pueden editar ni eliminar desde la app.

## Comandos

```powershell
npm run firebase:rules
npm run build
npx cap sync android
npx cap open android
```

No requiere Blaze, Storage ni Cloud Functions.
