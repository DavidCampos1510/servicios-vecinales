# Crear la primera cuenta administradora

La cuenta `admin` NO debe poder registrarse desde la aplicación. Se crea manualmente una sola vez en Firebase.

## 1. Crear usuario en Authentication
1. Firebase Console → proyecto `servicios-vecinales`.
2. Authentication → Users / Usuarios.
3. Agregar usuario.
4. Ingresa un correo exclusivo para administración y una contraseña segura.
5. Guarda y copia el UID creado.

## 2. Crear el perfil en Firestore
1. Firestore Database → colección `usuarios`.
2. Agrega un documento.
3. Como ID del documento usa EXACTAMENTE el UID de Authentication.
4. Agrega estos campos:

- `id` (string): el mismo UID
- `nombre` (string): Administrador
- `email` (string): el correo creado en Authentication
- `telefono` (string): un teléfono válido de 8 a 20 dígitos
- `tipo_usuario` (string): `admin`

`createdAt` es opcional para esta creación manual.

No crees un documento en `proveedores` para el administrador.

## 3. Iniciar sesión
Usa el formulario normal de inicio de sesión de Servicios Vecinales con el correo y contraseña del administrador.
La app abrirá automáticamente la pestaña **Admin**.

## 4. Qué puede hacer el panel
- Ver usuarios y proveedores.
- Revisar solicitudes de verificación.
- Aprobar/rechazar/retirar una verificación.
- Revisar reportes de proveedor o reseña.
- Ver actividad básica de solicitudes.

## Seguridad
Las reglas impiden que un cliente o proveedor cambie su `tipo_usuario` a `admin` desde la aplicación. La creación manual inicial desde Firebase Console es intencional.
