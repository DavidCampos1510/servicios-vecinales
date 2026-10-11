# Parche 09G — Apelaciones y soporte

Este parche agrega un canal real de contacto para cuentas suspendidas o eliminadas de Servicios Vecinales.

## Soporte oficial

Se utiliza como correo de soporte:

`soporte.serviciosvecinales@gmail.com`

El botón **Escribir a soporte** abre la aplicación de correo del teléfono o computador mediante `mailto:` con asunto y datos básicos de la cuenta ya preparados. No se almacena ninguna contraseña ni se envían correos automáticamente desde la app.

## Cuenta suspendida o eliminada

La persona ya no es expulsada inmediatamente de Firebase Authentication. Su sesión se mantiene únicamente para mostrar una pantalla restringida desde la cual puede:

- ver el motivo informado por administración;
- enviar una solicitud de revisión dentro de Servicios Vecinales;
- consultar el estado de esa solicitud;
- ver la respuesta de administración si se mantiene el bloqueo;
- enviar una nueva solicitud después de un rechazo;
- abrir un correo dirigido a soporte;
- cerrar sesión para usar otra cuenta.

La persona no puede entrar a Servicios, Solicitudes, Chat, Avisos ni Perfil mientras la cuenta esté bloqueada.

## Panel administrador

Se agrega **Solicitudes de revisión**.

Administración puede:

- ver nombre, correo, tipo de cuenta y motivo de moderación;
- leer el mensaje enviado por el usuario;
- responder al usuario;
- mantener la suspensión/eliminación;
- reactivar la cuenta directamente;
- abrir un correo dirigido al usuario.

Al reactivar desde una apelación, la actualización de la cuenta, el proveedor (si corresponde) y la apelación se realiza en una sola operación de Firestore.

## Reactivación

Si administración reactiva la cuenta, la app detecta el cambio en tiempo real. La persona ve la pantalla **¡Bienvenido de nuevo!** antes de recuperar el acceso normal.

## Firestore

Se agrega la colección:

`apelaciones/{UID_USUARIO}`

Solo el propietario puede crear/reenviar su propia apelación mientras su cuenta esté suspendida o eliminada. Solo el administrador puede listar todas las apelaciones y resolverlas.
