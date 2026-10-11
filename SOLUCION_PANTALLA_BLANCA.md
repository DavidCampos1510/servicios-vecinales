# Solución a la pantalla blanca (v5)

La v4 podía quedar completamente en blanco si se abría sin el archivo `.env` del proyecto Firebase.
La causa era una excepción lanzada desde `src/firebase.ts` antes de que React alcanzara a renderizar la interfaz.

## Qué cambia en v5

- Firebase ya no detiene toda la aplicación si faltan credenciales.
- Sin `.env`, la interfaz abre en modo local y muestra `Modo local · revisa .env`.
- Con un `.env` válido, sigue conectándose al Firebase real.
- Se agregó un Error Boundary para que un fallo de React muestre un diagnóstico visible en vez de una pantalla blanca.

## Para conectarlo a tu Firebase real

Copia tu archivo `.env` que ya contiene los datos de la app web Firebase a la raíz del proyecto v5. Debe quedar junto a `package.json`.

Variables esperadas:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_ID=(default)
```

Después de crear o modificar `.env`, detén Vite con `Ctrl+C` y vuelve a ejecutar:

```bash
npm run dev
```

Vite lee las variables `.env` al iniciar, por lo que reiniciar el servidor es obligatorio.
