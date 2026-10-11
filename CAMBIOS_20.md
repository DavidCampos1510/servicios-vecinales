# Parche 20 — Perfil unificado del proveedor

## Objetivo
Eliminar la duplicación entre "Datos de la cuenta" y "Presentación pública".

## Cambios
- País, región y ciudad/comuna se editan únicamente desde **Datos de la cuenta**.
- Al guardar esos datos en una cuenta de proveedor, se sincronizan también con `proveedores/{uid}` para que la presentación pública use la misma ubicación.
- La pestaña profesional "Perfil" pasa a llamarse **Presentación**.
- "Presentación pública" mantiene únicamente categorías, oficio, experiencia, descripción y WhatsApp público.
- Se elimina del formulario profesional la segunda edición de país/región/localidad.
- Se elimina "Foto pública por URL" del formulario profesional.
- La misma foto local elegida en la cuenta se usa en la presentación pública del proveedor en ese dispositivo.
- Se aclara que WhatsApp público puede ser distinto al teléfono personal/de cuenta.
- Se oculta temporalmente "Compartir perfil" tanto en el perfil público como en Mi perfil, porque esa función quedó aplazada.

## Firestore
Se agrega una rama específica para sincronizar de forma segura los campos de cuenta que alimentan la presentación pública:
- nombre_publico
- ubicacion
- pais_codigo / pais_nombre
- region_codigo / region_nombre
- localidad_nombre
- moneda_codigo
- prefijo_telefonico

La edición profesional ya no intenta reescribir ubicación ni foto.

## Archivos
- src/components/TabPerfil.tsx
- src/components/TabInicio.tsx
- src/state/databaseService.ts
- firestore.rules

## Instalación
```powershell
npm run firebase:rules
npm run build
npx cap sync android
npx cap open android
```
