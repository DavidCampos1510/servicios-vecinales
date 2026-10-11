# Servicios Vecinales

## Corrección v2.1: solicitudes y perfil móvil

Para corregir los errores al enviar/listar solicitudes y la tarjeta superior comprimida del proveedor, revisa `CORRECCION_SOLICITUDES_Y_PERFIL.md`.

Después de copiar tu `.env`, ejecuta:

```bash
npm run firebase:check
npm run firebase:rules
npm run dev
```

Las reglas de Firestore deben publicarse; ejecutar solamente `npm run dev` no modifica Firebase.


> Antes de ejecutar, completa las credenciales exactas siguiendo `CONFIGURAR_FIREBASE.md`.

Aplicación React + TypeScript + Firebase para conectar clientes con proveedores de servicios. Esta versión incorpora solicitudes de trabajo, reseñas verificadas, administración, PWA y preparación para Android con Capacitor.

## Requisitos

- Node.js 22 o superior (requisito de Capacitor 8).
- Un proyecto de Firebase con Authentication por correo/contraseña y Firestore.
- Firebase CLI para publicar reglas, funciones y Hosting.
- Android Studio solamente si generarás la APK.

## Instalación local

```bash
npm install
npm run dev
```

Validaciones:

```bash
npm run lint
npm run build
```

## Firebase

La aplicación conserva la configuración existente en `src/firebase-applet-config.json`. También puedes copiar `.env.example` como `.env` y completar las variables `VITE_FIREBASE_*`.

El proyecto utiliza la base Firestore nombrada:

```text
(default)
```

Si cambias de base de datos, modifica estos archivos:

- `.env`
- `firebase.json`
- `functions/src/index.ts`

### Publicar reglas y funciones

El comando `npm run firebase:rules` lee el ID exacto desde tu archivo `.env`. Inicia sesión e instala las dependencias de las funciones:

```bash
npm install -g firebase-tools
firebase login
npm --prefix functions install
npm run firebase:rules
npm run firebase:functions
```

La publicación de Cloud Functions requiere que el proyecto Firebase use el plan Blaze. Las reglas, Authentication, Firestore y Hosting pueden configurarse por separado.

Para compilar y publicar también Hosting:

```bash
npm run firebase:deploy
```

## Crear administrador

El registro público solamente permite crear clientes o proveedores. Para convertir una cuenta en administrador:

1. Registra la cuenta normalmente.
2. Abre Firestore en Firebase Console.
3. Busca `usuarios/{uid}`.
4. Cambia `tipo_usuario` a `admin` desde la consola.

El usuario no puede asignarse este rol desde la aplicación ni mediante las reglas públicas.

## Flujo de servicio y reseña

1. El cliente abre un proveedor y crea una solicitud.
2. El proveedor acepta, inicia y completa el trabajo.
3. Solamente entonces se habilita la reseña.
4. El ID de la reseña es el mismo ID de la solicitud, por lo que no puede duplicarse.
5. Una Cloud Function recalcula `calificacion_promedio` y `cantidad_resenas`.

## PWA

Después de `npm run build`, la aplicación incluye:

- Manifest.
- Service Worker.
- Iconos 192 y 512 px.
- Caché del shell de la aplicación.
- Instalación desde navegadores compatibles.

## Android con Capacitor 8

La primera vez:

```bash
npm install
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

Después de cada cambio web:

```bash
npm run android
```

Desde Android Studio puedes ejecutar la aplicación o generar un APK firmado.

## Modo local

Cuando la configuración Firebase es de demostración, se usa `localStorage`. Cuentas demo:

- Cliente: `jane.doe@example.com`
- Proveedor: `carlos.gomez@example.com`
- Administrador: `admin@example.com`

La contraseña demo puede ser cualquier texto de seis caracteres.

## Estructura principal

```text
src/components/TabInicio.tsx       búsqueda, perfiles, solicitudes y reseñas
src/components/TabSolicitudes.tsx  seguimiento de trabajos
src/components/TabPerfil.tsx       autenticación y perfil profesional
src/components/TabAdmin.tsx        panel administrativo
src/state/databaseService.ts       acceso unificado a Firestore/localStorage
firestore.rules                     seguridad de Firestore
functions/src/index.ts              promedio automático de reseñas
public/                             PWA
capacitor.config.ts                 Android/Capacitor
```

Revisa `CAMBIOS_1_A_10.md` para conocer todo lo corregido.


## Cambios v4

- Detalle del proveedor sin barra inferior redundante.
- Flujo independiente para restablecer contraseña con Firebase Authentication.
- Autocompletado local con las 346 comunas de Chile en búsqueda, solicitudes y perfil del proveedor.

Consulta `CAMBIOS_V4.md` para el detalle y las comprobaciones manuales en Firebase.

## Corrección v5 — pantalla blanca

La inicialización de Firebase ahora es tolerante a una configuración faltante: sin `.env` la aplicación entra en modo local en lugar de quedar en blanco. También se agregó un límite de errores visual para mostrar fallos de renderizado. Consulta `SOLUCION_PANTALLA_BLANCA.md`.

## Cambios v6 — reseñas desde Solicitudes

Cuando un trabajo está completado, el cliente puede calificarlo directamente desde la tarjeta de la solicitud. La reseña es opcional y ya no es necesario volver a buscar el perfil del proveedor.

## Cambios v7 — avisos en tiempo real

Se agregó la pestaña **Avisos** para clientes y proveedores, contador de no leídas y sincronización en tiempo real con Firestore. Se generan avisos por nuevas solicitudes, cambios de estado y nuevas reseñas. Antes de probar esta versión debes publicar las reglas actualizadas con `npm run firebase:rules`.
