# Correcciones aplicadas del 1 al 10

## 1. Reseñas y Timestamp

- Las fechas ya no se envían como texto.
- Se usa `serverTimestamp()`.
- La interfaz acepta tanto Timestamp de Firestore como fechas locales.

## 2. Promedio fuera del cliente

- El navegador ya no modifica `calificacion_promedio`.
- `functions/src/index.ts` recalcula el promedio y la cantidad de reseñas al crear o eliminar una reseña.

## 3. Roles y privacidad

- Cada usuario solamente puede leer y editar su perfil.
- Solamente un administrador puede listar usuarios.
- El rol del usuario es inmutable desde la aplicación.
- Proveedores, clientes y administradores tienen permisos separados.

## 4. Reseñas verificadas y no duplicadas

- La reseña exige una solicitud completada.
- El cliente y el proveedor deben coincidir con la solicitud.
- El ID de la reseña corresponde a la solicitud, impidiendo duplicados.

## 5. Actualizaciones parciales

- El perfil profesional usa `updateDoc()` solamente en campos editables.
- Fotografías, datos personales y verificación se actualizan por separado.
- El proveedor no puede modificar su promedio ni su estado de verificación.

## 6. Errores, carga y validaciones

- Se agregaron `try/catch/finally`, mensajes visibles y reintentos.
- Se corrigió la restauración de sesión.
- El alta de usuario y proveedor se guarda en un batch atómico para evitar perfiles incompletos.
- Formularios con límites, teléfono validado y contraseñas mínimas.
- Recuperación de contraseña y correo de verificación.

## 7. Limpieza técnica

- Se retiraron Gemini, Express, dotenv y dependencias que no se utilizaban.
- TypeScript quedó en modo estricto.
- El comando `clean` funciona en Windows mediante `rimraf`.
- README y metadatos fueron reemplazados.

## 8. Despliegue Firebase

- Se añadieron `firebase.json`, `firestore.indexes.json` y `.firebaserc.example`.
- Se incluyó el proyecto de Cloud Functions.
- La configuración acepta variables `VITE_FIREBASE_*`.

## 9. Solicitudes y administración

- Nuevo flujo solicitado → aceptado → en proceso → completado.
- Cancelación y rechazo según el rol.
- Panel administrativo con métricas y verificación de proveedores.
- Insignia pública para proveedores verificados.

## 10. PWA y Android

- Manifest, Service Worker e iconos instalables.
- Configuración de Capacitor 8 con Node.js 22.
- Scripts para crear, sincronizar y abrir el proyecto Android.


## Ajuste de proyecto Firebase

La configuración fue actualizada para apuntar al ID supuesto `servicios-vecinales`, usando Firestore `(default)`. Las credenciales del proyecto anterior fueron eliminadas y deben completarse con el SDK web real del proyecto.
