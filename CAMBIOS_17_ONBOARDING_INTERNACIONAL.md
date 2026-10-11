# Parche 17 — Onboarding e internacionalización

## Países habilitados
- Chile
- Argentina
- México
- Colombia
- Perú

España no está incluido en esta versión.

## Flujo inicial
- Primera apertura: splash de Servicios Vecinales usando el icono existente.
- Sin sesión: abre directamente Crear cuenta.
- Registro: ubicación primero, luego tipo de cuenta y datos personales.
- Al terminar el registro o iniciar sesión manualmente: abre Mi perfil.
- Se mantiene el enlace “Ya tengo una cuenta · Iniciar sesión”.

## Ubicación estructurada
Se guardan por separado país, región/estado/provincia/departamento y localidad, además de moneda y prefijo telefónico.

Chile conserva el catálogo local de 346 comunas. Para Argentina, México, Colombia y Perú se incluyen todas las divisiones territoriales de primer nivel y la localidad/municipio/distrito se escribe manualmente, sin depender de APIs pagadas.

## Búsqueda
Servicios filtra proveedores por:
- país
- región/estado/provincia/departamento
- localidad/comuna/municipio/distrito
- categoría
- disponibilidad
- texto/oficio

Para usuarios registrados se agregan accesos rápidos: Mi localidad, Toda mi región y Todo mi país.

## Teléfono y moneda
- Chile: +56 / CLP
- Argentina: +54 / ARS
- México: +52 / MXN
- Colombia: +57 / COP
- Perú: +51 / PEN

Las cotizaciones muestran la moneda asociada al país del proveedor.

## Términos y privacidad
La versión legal pasa a `2026-08-11-17`.
El Centro legal adapta Términos, Privacidad y Normas al país seleccionado. Cambiar de país invalida la aceptación previa y obliga a revisar la documentación de la nueva jurisdicción.

Los anexos jurídicos son una base informativa de implementación, no una certificación de cumplimiento. Antes de un lanzamiento comercial deben revisarse identidad/domicilio del responsable y obligaciones concretas de cada país.

## Compatibilidad
- Las cuentas existentes no deben volver a registrarse.
- Perfiles antiguos sin ubicación estructurada continúan funcionando con compatibilidad Chile.
- Pueden completar país/región/localidad desde Mi perfil.
- Se conserva la corrección de permisos de agenda del parche 14C.

## Instalación
Reemplazar los archivos incluidos y ejecutar:

```powershell
npm run firebase:rules
npm run build
npx cap sync android
npx cap open android
```
