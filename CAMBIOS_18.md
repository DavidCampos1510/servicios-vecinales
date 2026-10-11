# Parche 18 — Perfil, cotizaciones y compartir proveedor

## Corrección de permisos de ubicación
- Corrige `permission-denied` al actualizar país, región y localidad/comuna del proveedor.
- Las reglas validan únicamente los campos editables y mantienen compatibilidad con perfiles antiguos.
- También se protege la edición geográfica del documento de usuario.
- Nombre público, agenda y portafolio mantienen ramas de permisos independientes.

## Cotizaciones avanzadas
Ahora una cotización puede incluir:
- mano de obra
- materiales
- otros costos
- costo de visita
- descuento monetario
- anticipo
- forma de pago
- vigencia: 3, 7, 15 o 30 días
- observaciones

Cálculo:
`total = mano de obra + materiales + otros + costo de visita - descuento`

El anticipo no se descuenta del total: se muestra como pago inicial y se calcula el saldo restante.

### Vigencia
- Una cotización vencida no puede ser aceptada.
- El cliente puede rechazar una cotización vencida.
- El proveedor puede renovar una cotización vencida sin esperar una respuesta.

### Historial
Cuando una cotización rechazada o vencida se reemplaza, se archiva en:
`solicitudes/{solicitudId}/cotizaciones_historial/{id}`

Cliente y proveedor pueden desplegar las últimas 20 propuestas anteriores desde la solicitud.

## Compartir perfil
- Perfil público: botón **Compartir perfil**.
- Mi perfil del proveedor: botón **Compartir mi perfil**.
- Android/dispositivos compatibles: usa el menú nativo para WhatsApp, correo y otras apps.
- Web publicada: agrega `?provider=UID`, y la app abre directamente ese perfil.
- Local/Capacitor sin dominio público: comparte la ficha textual sin generar un enlace `localhost` inválido.
- Navegadores sin Web Share: intenta copiar la ficha/enlace al portapapeles.

## Archivos a reemplazar
- `src/components/TabPerfil.tsx`
- `src/components/TabInicio.tsx`
- `src/components/TabSolicitudes.tsx`
- `src/state/databaseService.ts`
- `src/types.ts`
- `firestore.rules`

## Comandos
```powershell
npm run firebase:rules
npm run build
npx cap sync android
npx cap open android
```
