PARCHE 21 — SERVICIOS VECINALES (base v7 + parche 20)

Cambios:
1. Se retira la sección visual "Apariencia y accesibilidad" del perfil (también la vista de acceso). No se eliminan preferencias guardadas ni otras funciones.
2. Se reduce el botón "Editar datos" a "Editar" y se mantiene la acción de abrir/cerrar el formulario.
3. Se añade "Compartir perfil" en Presentación pública del proveedor: menú nativo de compartir, con alternativa a WhatsApp Web si no existe navigator.share.

IMPORTANTE: esta función comparte los datos del proveedor ahora. Para añadir un enlace ABRIBLE desde WhatsApp en otros dispositivos, configurar VITE_PUBLIC_APP_URL=https://tu-dominio-publico antes de compilar la WEB. La aplicación ya procesa ?provider=ID en TabInicio, pero el despliegue debe estar publicado y permitir la apertura de enlaces. No se incluye enlace localhost o capacitor, porque sería inválido para terceros.

Instalación: crea una copia del proyecto y sustituye únicamente src/components/TabPerfil.tsx por el archivo incluido; compila y prueba en Android y web. No sobrescribas archivos .env, Firebase ni reglas.

Verificación: el código fue inspeccionado. No se pudo completar tsc --noEmit en este entorno por falta de definiciones de tipos de node y vite/client en las dependencias extraídas. No se ha probado en dispositivo.
