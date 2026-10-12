SERVICIOS VECINALES — PARCHE 21 ACTUALIZADO
Base: servicios-vecinales-corregido-v7(2).zip

Incluye:
1. Ajustes previos del perfil del proveedor (eliminacion visual de Apariencia y accesibilidad; boton Editar mas compacto; opcion de compartir datos del perfil).
2. Buscador de servicios mas compacto en Android y en la vista web: menores margenes, alturas y separaciones. Conserva todos los campos, handlers, opciones y filtros.

INSTALACION:
1. Guarda copia de seguridad del proyecto actual.
2. Copia los archivos de este ZIP dentro de la raiz del proyecto existente conservando las rutas:
   src/components/TabPerfil.tsx
   src/components/TabInicio.tsx
3. Reconstruye y prueba la aplicacion en Android y web. No reemplazar archivos de configuracion ni Firebase.

NOTAS:
- No se ha configurado un dominio web publico ni Android App Links, por lo que compartir un enlace que abra el perfil desde WhatsApp sigue siendo una tarea pendiente. El archivo TabPerfil.tsx conserva lo preparado en el parche 21 anterior.
- No se ejecutaron pruebas completas de compilacion o dispositivos en este entorno. Verifica navegacion, filtros, selecciones y renderizados antes de distribuir.
- El archivo cambios_buscador_compacto.diff contiene solo el diff visual del buscador.
