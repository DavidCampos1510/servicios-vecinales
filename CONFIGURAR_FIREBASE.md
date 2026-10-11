# Configuración de Firebase: servicios-vecinales

El proyecto quedó apuntando al ID supuesto `servicios-vecinales` y a la base Firestore `(default)`.

## Importante

El nombre visible del proyecto y el ID del proyecto pueden ser diferentes. Revisa el valor exacto en:

**Firebase Console > Configuración del proyecto > General > ID del proyecto**

Si el ID real tiene un sufijo, por ejemplo `servicios-vecinales-12345`, reemplaza `servicios-vecinales` en:

- `.firebaserc`
- `.env`
- `src/firebase-applet-config.json`
- `firebase-applet-config.json`

## Completar las credenciales web

1. En Firebase Console abre **Configuración del proyecto**.
2. Baja hasta **Tus apps**.
3. Selecciona o crea la aplicación web.
4. Copia los valores del objeto `firebaseConfig`.
5. Copia `.env.example` como `.env`.
6. Reemplaza los tres valores marcados con `REEMPLAZAR`.

Ejemplo:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=servicios-vecinales.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=servicios-vecinales
VITE_FIREBASE_STORAGE_BUCKET=servicios-vecinales.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_DATABASE_ID=(default)
```

No se conservaron la API key, App ID ni Sender ID del proyecto anterior, porque conectarían parte de la aplicación a otro proyecto Firebase.

## Publicar configuración

```bash
firebase login
firebase use servicios-vecinales
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting
```
