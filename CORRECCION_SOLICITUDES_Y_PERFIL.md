# Corrección de solicitudes y perfil del proveedor

Esta versión corrige los tres problemas observados en las capturas:

1. La solicitud mostraba un error genérico al enviarse.
2. La tarjeta superior del proveedor comprimía y ocultaba la foto y sus datos.
3. La pestaña Solicitudes mostraba el mismo error genérico al consultar Firestore.

## Cambios aplicados

- La vista de detalle ya no comprime sus secciones: la foto, nombre/oficio, ubicación, experiencia, calificación y botones quedan visibles.
- Se agregó `nombre_publico` al perfil profesional. Los proveedores nuevos lo guardan al registrarse.
- Los proveedores existentes migran su nombre automáticamente cuando vuelven a iniciar sesión. También se actualiza al editar el nombre personal.
- El formulario de solicitud permite confirmar o corregir el teléfono de contacto.
- El teléfono se normaliza antes de enviarse a Firestore.
- Se valida que la sesión autenticada corresponda al cliente que crea o consulta la solicitud.
- Los errores de Firebase ahora conservan el código original. Si el problema es de reglas, sesión, red o índice, se muestra una explicación concreta.
- Las reglas de Firestore para solicitudes y reseñas se basan en la identidad autenticada y en la relación cliente/proveedor del documento.
- La pantalla Solicitudes muestra un botón **Reintentar** y no mezcla un error con el mensaje “Aún no hay solicitudes”.

## Paso obligatorio: copiar tu archivo `.env`

El ZIP no incluye tus credenciales privadas. Copia el archivo `.env` que ya estás utilizando desde tu proyecto anterior y pégalo en la raíz de esta nueva carpeta.

Después comprueba que el proyecto sea el correcto:

```bash
npm run firebase:check
```

El comando debe mostrar el ID real de tu proyecto y la base `(default)`.

## Paso obligatorio: publicar las reglas corregidas

Las modificaciones de `firestore.rules` no se aplican solamente por ejecutar React. Debes publicarlas en Firebase.

```bash
npm install -g firebase-tools
firebase login
npm run firebase:rules
```

El script lee `VITE_FIREBASE_PROJECT_ID` desde tu `.env`, por lo que publica las reglas en el mismo proyecto usado por la aplicación y evita hacerlo accidentalmente en otro proyecto.

Luego reinicia la aplicación:

```bash
npm run dev
```

## Prueba recomendada

1. Inicia sesión como cliente.
2. Abre el perfil de un proveedor.
3. Comprueba que aparezca completa la tarjeta superior.
4. Selecciona **Solicitar este servicio**.
5. Escribe descripción, ubicación y teléfono.
6. Envía la solicitud.
7. Abre la pestaña **Solicitudes**.
8. La solicitud debe aparecer con estado **Solicitada**.
9. En Firebase Console debe crearse un documento dentro de la colección `solicitudes`.

## Proveedores existentes sin nombre público

El nombre se migrará cuando el proveedor vuelva a iniciar sesión con esta versión. También puede abrir **Mi perfil**, editar su nombre y guardarlo. No es necesario eliminar la cuenta ni crear nuevamente el perfil.
