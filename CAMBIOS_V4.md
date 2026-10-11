# Servicios Vecinales v4 — perfil, contraseña y comunas de Chile

Esta versión continúa sobre la v3 y mantiene el diseño general de la aplicación.

## 1. Detalle del proveedor sin navegación inferior

- Al abrir **Ver perfil**, la barra inferior global se oculta.
- El usuario vuelve al listado únicamente con **Volver**.
- Se evita mostrar la pestaña "Servicios" dentro del detalle del proveedor, donde era redundante.
- Se redujo el espacio inferior del detalle para aprovechar mejor la pantalla.

## 2. Restablecimiento de contraseña

- **Olvidé mi contraseña** ahora abre una pantalla específica de recuperación.
- El correo de inicio de sesión se copia automáticamente al formulario de recuperación si ya estaba escrito.
- Se valida el formato del correo antes de llamar a Firebase.
- Se muestra estado **Enviando...** mientras se procesa la solicitud.
- Se usa `sendPasswordResetEmail()` de Firebase Authentication.
- Firebase Auth queda configurado con `languageCode = 'es'` para los correos de autenticación compatibles con idioma.
- Se agregaron mensajes específicos para correo inválido, proveedor Email/Password deshabilitado, dominio no autorizado y otros errores comunes.
- El mensaje de éxito ya no afirma que el correo necesariamente llegó: indica que Firebase aceptó la solicitud y recuerda revisar Spam.

### Comprobación manual en Firebase

En Firebase Console revisa:

1. **Authentication > Sign-in method**: debe estar habilitado **Correo electrónico/contraseña**.
2. **Authentication > Users**: el correo con el que pruebas debe corresponder a una cuenta real si esperas recibir el enlace.
3. **Authentication > Templates > Password reset**: revisa remitente, asunto y contenido de la plantilla.
4. **Authentication > Settings > Authorized domains**: agrega el dominio desde el que publicas la app si corresponde.
5. Revisa también la carpeta Spam/Correo no deseado.

## 3. Autocompletado de comunas de Chile

Se agregó un catálogo local con **346 comunas**, agrupadas en las 16 regiones.

Ejemplo:

- El usuario escribe `san ant`.
- Aparece `San Antonio`.
- Debajo se muestra `Región de Valparaíso, Chile`.
- Al seleccionar, el campo queda como `San Antonio, Región de Valparaíso, Chile`.

Características:

- No utiliza Google Maps.
- No requiere API Key adicional.
- No genera costo por búsquedas.
- Ignora mayúsculas y tildes.
- Prioriza comunas que comienzan con el texto escrito.
- Permite navegar por sugerencias con flechas y Enter en teclado.

El autocompletado se agregó en:

- Buscador principal por comuna.
- Formulario para solicitar un servicio.
- Edición de ubicación del proveedor.

Para mantener compatibilidad con proveedores antiguos que tengan solo `San Antonio`, al filtrar se utiliza el nombre de la comuna antes de la primera coma.
