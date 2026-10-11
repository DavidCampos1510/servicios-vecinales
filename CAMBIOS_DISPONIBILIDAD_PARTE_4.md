# Servicios Vecinales — Parche 04: Disponibilidad

Este parche se aplica sobre la versión 7 que ya tenga instalados los parches anteriores (Favoritos, Historial organizado y Detalle de solicitud).

## Qué agrega

### Para proveedores
- Nueva sección **Disponibilidad** en `Mi perfil`.
- Estados disponibles:
  - Disponible ahora
  - Disponible hoy
  - Con agenda
  - No disponible
- Campo opcional **Horario o referencia**, por ejemplo: `Lun a Vie 09:00–18:00`.
- El cambio se guarda en Firestore y se refleja para los clientes.

### Para clientes y visitantes
- Nuevo filtro de disponibilidad en Buscar Servicios.
- Cada tarjeta muestra el estado de disponibilidad del proveedor.
- El perfil completo del proveedor muestra estado y horario.
- Si el proveedor marca `No disponible`, todavía se puede enviar una solicitud para coordinar una fecha futura.

### Compatibilidad
- Los proveedores antiguos que aún no tengan estos campos siguen apareciendo normalmente.
- Mientras no configuren su estado se muestra `Consultar disponibilidad`.

## Archivos que reemplaza

- `src/types.ts`
- `src/constants.ts`
- `src/state/databaseService.ts`
- `src/components/TabInicio.tsx`
- `src/components/TabPerfil.tsx`
- `firestore.rules`

## Firebase

Este parche modifica reglas de Firestore, por lo que debes publicar las reglas:

```powershell
npm run firebase:rules
```

## Android

Desde la raíz del proyecto:

```powershell
npm run build
npx cap sync android
```

Después abre Android Studio y ejecuta la app con **Run ▶**.

No ejecutes `npx cap add android` y no modifiques JDK, Gradle ni Android SDK.
