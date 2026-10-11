# Servicios Vecinales v6

## Reseñas desde Solicitudes

- La reseña sigue siendo **opcional**.
- El cliente ya no necesita volver a buscar el perfil del proveedor para calificarlo.
- Cuando una solicitud queda en estado **Completada**, la misma tarjeta muestra **Calificar servicio**.
- Al abrir la calificación, el proveedor queda identificado automáticamente.
- El cliente selecciona entre 1 y 5 estrellas y escribe un comentario de 10 a 1000 caracteres.
- **Ahora no** cierra el formulario sin bloquear ninguna función de la aplicación.
- Una vez enviada, la tarjeta muestra **Reseña enviada** y no permite una segunda reseña para la misma solicitud.
- En el perfil del proveedor solo se muestran las reseñas; la creación de reseñas se trasladó a Solicitudes.

## Compatibilidad con Firebase

Esta versión conserva el mismo esquema de Firestore y las mismas reglas de la v5. No es necesario cambiar las reglas solo por este ajuste de interfaz.

Para comprobarla:

```bash
npm install
npm run dev
```

Recuerda copiar tu archivo `.env` de Firebase a la raíz del proyecto antes de ejecutar Vite.
