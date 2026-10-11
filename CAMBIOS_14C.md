# Parche 14C — Agenda: permisos compatibles con perfiles antiguos

## Problema
La actualización de disponibilidad seguía dependiendo de `id` y `usuario_id` almacenados dentro del documento del proveedor. En perfiles creados con versiones anteriores esos campos pueden faltar o no coincidir con el formato actual, produciendo `permission-denied`.

## Corrección
- La regla específica de agenda se evalúa primero.
- El dueño se identifica por el UID usado como ID del documento `proveedores/{uid}`.
- La actualización solo puede modificar `disponibilidad`, `horario_atencion` y `agenda_semanal`.
- Se valida la estructura de los 7 días sin volver a validar el resto del perfil histórico.
- No cambia código React/Android.

## Aplicación
Reemplazar `firestore.rules` y ejecutar `npm run firebase:rules`.
