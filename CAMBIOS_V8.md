# Cambios v8 — interfaz Android a pantalla completa

## Problema corregido
La aplicación Android mostraba el marco de teléfono de la demo web dentro de la pantalla real del dispositivo. Eso hacía que el APK pareciera una maqueta o una página web centrada.

## Solución
- Se detecta si la aplicación está ejecutándose mediante Capacitor.
- En Android/iOS se elimina el marco simulado, el fondo negro, la cabecera externa, el indicador de Firebase y el texto inferior de tecnologías.
- La interfaz de Servicios Vecinales ocupa el 100% de la WebView (`100dvh`).
- En navegador de escritorio se conserva el mockup de teléfono para presentación.
- No se modifican Firebase, Firestore, solicitudes, reseñas ni notificaciones.

## Actualizar un proyecto Android ya creado
No borres la carpeta `android` que ya tienes funcionando. Copia los cambios de `src/components/PhoneFrame.tsx` y `src/index.css` a tu proyecto actual y desde la raíz ejecuta:

```powershell
npm run build
npx cap sync android
```

Luego abre Android Studio (o si ya estaba abierto, sincroniza) y pulsa Run.
