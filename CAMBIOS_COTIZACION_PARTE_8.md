# Parche 08 — Cotización y precios

Este parche se aplica sobre la versión 7 que ya tiene instalados los parches anteriores.

## Qué agrega

- Cotización opcional asociada a cada solicitud aceptada.
- El proveedor puede indicar:
  - mano de obra;
  - materiales;
  - otros costos;
  - observaciones;
  - total calculado automáticamente.
- El cliente puede aceptar o rechazar la cotización.
- Si el cliente rechaza, el proveedor puede preparar y enviar una nueva propuesta.
- Si existe una cotización pendiente o rechazada, el proveedor no puede pasar el trabajo a `En proceso`.
- Si no existe cotización, el flujo anterior se mantiene y el proveedor puede iniciar el trabajo normalmente.
- Avisos internos para:
  - nueva cotización;
  - cotización aceptada;
  - cotización rechazada.
- Las cotizaciones aparecen dentro del detalle de la solicitud.
- Los datos quedan guardados en Firestore en:

```text
solicitudes/{solicitudId}/cotizacion/actual
```

## Archivos a reemplazar

```text
src/types.ts
src/state/databaseService.ts
src/components/TabSolicitudes.tsx
src/components/TabNotificaciones.tsx
firestore.rules
```

## Después de copiar los archivos

Desde la raíz del proyecto:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Después abre Android Studio:

```powershell
npx cap open android
```

y ejecuta la aplicación con **Run**.

No es necesario ejecutar `npx cap add android` ni modificar Java, Gradle, SDK o `local.properties`.

## Flujo recomendado de prueba

1. Cliente crea una solicitud.
2. Proveedor acepta la solicitud.
3. Proveedor abre el detalle y pulsa `Crear cotización`.
4. Ingresa montos y envía.
5. Cliente recibe un aviso interno y abre la solicitud.
6. Cliente acepta o rechaza.
7. Si acepta, el proveedor puede pasar el trabajo a `En proceso`.
8. Si rechaza, el proveedor puede enviar una nueva cotización.

La cotización es opcional: si el proveedor no crea una, el flujo puede continuar sin ella.
