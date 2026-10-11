# Parche 09B — Admin + corrección de verificación

- Corrige `permission-denied` al solicitar verificación en perfiles antiguos sin `verificado` persistido.
- Migra el campo `verificado: false` al momento de solicitar verificación.
- Ajusta reglas para aceptar esa migración segura.
- Garantiza panel Admin y entrada automática al iniciar sesión con rol `admin`.
- Para administradores se ocultan pestañas de cliente/proveedor y quedan Admin + Mi perfil.
- Incluye guía para crear la primera cuenta admin manualmente en Firebase.
