# Especificación de seguridad

- Denegación global por defecto.
- Usuarios: lectura propia; listado administrativo; rol y correo inmutables.
- Proveedores: lectura pública; edición profesional solamente por el propietario.
- Verificación: solamente administradores.
- Calificaciones: solamente Cloud Functions con Admin SDK.
- Solicitudes: visibles únicamente para cliente, proveedor involucrado o administrador.
- Estados: transiciones limitadas por rol.
- Reseñas: una por solicitud completada, inmutables para clientes y proveedores.
