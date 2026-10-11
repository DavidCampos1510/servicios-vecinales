# Parche 07 — Notificaciones push Android

Este parche se aplica sobre Servicios Vecinales v7 con los parches anteriores (Favoritos, Historial, Detalle, Disponibilidad, Categorías y Chat).

## Qué agrega

- Notificaciones nativas Android mediante Firebase Cloud Messaging (FCM).
- Permiso de notificaciones solicitado desde `Mi perfil`, no al abrir la app sin contexto.
- Registro del dispositivo asociado al usuario autenticado.
- Push para:
  - nueva solicitud;
  - solicitud aceptada/rechazada;
  - trabajo en proceso/completado/cancelado;
  - nueva reseña;
  - nuevo mensaje del chat.
- Al tocar una push se abre la sección `Solicitudes`.
- Canal Android `Servicios Vecinales` con sonido y prioridad alta.
- Los tokens inválidos o vencidos se eliminan automáticamente cuando Firebase los rechaza.
- Al cerrar sesión se elimina el registro push del dispositivo de esa cuenta.

## Archivos del parche

- `src/App.tsx`
- `src/components/TabPerfil.tsx`
- `src/components/TabNotificaciones.tsx`
- `src/state/databaseService.ts`
- `src/state/pushNotifications.ts` (nuevo)
- `src/types.ts`
- `capacitor.config.ts`
- `firestore.rules`
- `functions/src/index.ts`

## Paso manual 1 — Instalar el plugin

Desde la raíz del proyecto:

```powershell
npm install @capacitor/push-notifications@8
```

No vuelvas a ejecutar `npx cap add android`.

## Paso manual 2 — Registrar la app Android en Firebase

En Firebase Console:

1. Abre el proyecto `servicios-vecinales`.
2. Configuración del proyecto → General → Tus apps.
3. Si todavía no existe una app Android, pulsa `Agregar app` → Android.
4. Nombre del paquete Android (debe ser exacto):

```text
cl.serviciosvecinales.app
```

5. Descarga `google-services.json`.
6. Copia ese archivo en:

```text
android/app/google-services.json
```

No copies `google-services.json` a `src` ni a la raíz.

## Paso manual 3 — Publicar Firebase

```powershell
npm run firebase:rules
npm run firebase:functions
```

El segundo comando publica las funciones que envían las notificaciones push.

## Paso manual 4 — Actualizar Android

```powershell
npm run build
npx cap sync android
```

Después abre Android Studio y pulsa Run.

## Activar en el teléfono

1. Inicia sesión como cliente o proveedor.
2. Abre `Mi perfil`.
3. Busca `Notificaciones en el celular`.
4. Pulsa `Activar notificaciones`.
5. Acepta el permiso de Android.

En Firestore debería aparecer:

```text
usuarios
└── UID_USUARIO
    └── pushTokens
        └── TOKEN_DISPOSITIVO
```

## Prueba recomendada

### Proveedor recibe push

- Deja al proveedor iniciado en el celular.
- Desde otro usuario cliente (por ejemplo desde la web), crea una solicitud.
- El proveedor debería recibir una notificación del sistema Android.

### Cliente recibe push

- Deja al cliente iniciado en el celular.
- El proveedor acepta o cambia el estado desde otra sesión.
- El cliente debería recibir el aviso.

### Chat

- Envía un mensaje desde la otra cuenta.
- El receptor recibe una push y también un aviso interno `Nuevo mensaje`.

## Nota

La vista web continúa usando los avisos internos. La notificación nativa se registra únicamente cuando la aplicación se ejecuta como Android mediante Capacitor.
