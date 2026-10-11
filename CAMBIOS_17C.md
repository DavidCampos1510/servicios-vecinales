# Parche 17C — Corrección de permisos al aceptar términos

## Problema
Las cuentas creadas con versiones anteriores podían recibir `permission-denied` al aceptar la versión legal 2026-08-11-17.

La rama de actualización legal ejecutaba `isValidUsuario()` sobre el documento completo. Un campo legado no reconocido podía bloquear la operación aunque el usuario solo estuviera cambiando los campos legales.

## Corrección
La aceptación de términos ahora:
- exige que el usuario autenticado sea dueño de `usuarios/{uid}`;
- permite modificar únicamente los campos legales de aceptación;
- exige versión `2026-08-11-17`;
- exige jurisdicción válida CL/AR/MX/CO/PE y coherente con el país del perfil cuando existe;
- exige timestamps del servidor (`request.time`);
- no revalida campos históricos ajenos a la aceptación.

No cambia código React ni Android.
