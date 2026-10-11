# Parche 14 — Agenda avanzada del proveedor

## Qué agrega

### Proveedor
- Agenda semanal de lunes a domingo en **Mi perfil > Disponibilidad**.
- Cada día puede activarse o desactivarse.
- Cada día activo tiene hora de inicio y término.
- Se conserva el estado general: Disponible ahora / Disponible hoy / Con agenda / No disponible.
- La referencia de horario anterior pasa a ser un texto adicional opcional.
- Los horarios se guardan en Firestore dentro de `proveedores/{uid}.agenda_semanal`.

### Cliente
- El perfil público del proveedor muestra su horario semanal.
- Al solicitar un servicio puede proponer **fecha y hora**.
- Fecha y hora son opcionales: si se dejan vacías, el servicio queda **por coordinar**.
- Si el proveedor tiene agenda semanal configurada, la app valida que la fecha corresponda a un día activo y que la hora esté dentro del rango publicado.
- No se permiten fechas pasadas.

### Solicitudes
- Cliente y proveedor ven la fecha/hora propuesta en la tarjeta de la solicitud y en su detalle.
- Si no se propuso una fecha, se muestra `Por coordinar`.
- La propuesta no cambia automáticamente el estado del servicio: sirve como referencia para que ambas partes la confirmen por chat.

## Nuevos campos

### proveedores/{uid}
```text
agenda_semanal: {
  lunes:    { activo: true,  desde: "09:00", hasta: "18:00" },
  martes:   { activo: true,  desde: "09:00", hasta: "18:00" },
  miercoles:{ activo: true,  desde: "09:00", hasta: "18:00" },
  jueves:   { activo: true,  desde: "09:00", hasta: "18:00" },
  viernes:  { activo: true,  desde: "09:00", hasta: "18:00" },
  sabado:   { activo: false, desde: "09:00", hasta: "14:00" },
  domingo:  { activo: false, desde: "09:00", hasta: "14:00" }
}
```

### solicitudes/{id}
Campos opcionales:
```text
fecha_preferida: "2026-08-15"
hora_preferida: "10:30"
```

## Archivos modificados
- `src/components/TabPerfil.tsx`
- `src/components/TabInicio.tsx`
- `src/components/TabSolicitudes.tsx`
- `src/state/databaseService.ts`
- `src/types.ts`
- `src/constants.ts`
- `firestore.rules`

## Instalación
Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
npx cap open android
```

No requiere Blaze, Storage ni Cloud Functions.

## Prueba recomendada
1. Entrar como proveedor.
2. Ir a Mi perfil > Disponibilidad.
3. Configurar, por ejemplo, lunes a viernes de 09:00 a 18:00 y guardar.
4. Entrar como cliente y abrir ese proveedor.
5. Confirmar que aparece el horario semanal.
6. Crear una solicitud indicando una fecha y hora dentro del horario.
7. Revisar la solicitud como cliente y proveedor y confirmar que aparece la fecha propuesta.
8. Probar una hora fuera del rango: la app debe avisar antes de enviar.
9. Crear otra solicitud futura dejando fecha/hora vacías después de cerrar la anterior: debe aparecer `Por coordinar`.
