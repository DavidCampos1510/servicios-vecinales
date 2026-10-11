# Parche 14B — Corrección de permisos de agenda

Corrige `permission-denied` al actualizar disponibilidad/agenda del proveedor.

## Causa
La regla general de edición del proveedor ejecutaba `isValidProveedor()` sobre todo el documento. Los perfiles creados con versiones anteriores pueden contener campos o formatos históricos que hacen fallar esa validación, aunque el usuario solo esté modificando disponibilidad y agenda.

## Corrección
Se agregó una rama específica que permite al proveedor propietario actualizar exclusivamente:

- `disponibilidad`
- `horario_atencion`
- `agenda_semanal`

La regla valida esos tres campos y la estructura de los siete días, sin volver a validar el resto del perfil.

## Instalación
Reemplazar `firestore.rules` y ejecutar:

```powershell
npm run firebase:rules
```

No es necesario cambiar código React/TypeScript ni volver a sincronizar Android para esta corrección de permisos. Si la app ya está abierta, vuelve a intentar guardar la disponibilidad después de publicar las reglas.
