# Parche 12 — Panel administrador mejorado

Este parche reorganiza el panel en cinco áreas: Resumen, Verificación, Reportes, Revisiones y Cuentas.

## Nuevo resumen
- Clientes registrados.
- Proveedores registrados.
- Proveedores verificados.
- Trabajos activos y completados.
- Usuarios suspendidos.
- Alertas pendientes de administración.
- Indicadores de verificación, finalización y resolución de reportes.
- Categorías más ofrecidas.
- Comunas con más proveedores.
- Actividad reciente.

## Gestión de cuentas
- Buscador por nombre, correo o teléfono.
- Filtro por cliente/proveedor.
- Filtro por estado activa/suspendida/eliminada.
- Mantiene las acciones de suspender, reactivar y eliminar de la app.

## Compatibilidad
No cambia Firestore, reglas, Android, Firebase Auth ni Cloud Functions. Solo reemplaza TabAdmin.tsx.
