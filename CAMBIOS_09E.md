# Parche 09E — Reactivación de cuentas y re-solicitud de verificación

## Cambios

### Acceso de cuentas moderadas
- Cuenta suspendida: al intentar ingresar se muestra un mensaje claro con el motivo (si existe) y se indica contactar con la administración de Servicios Vecinales para solicitar revisión/reactivación.
- Cuenta eliminada de la app: al intentar ingresar se muestra un mensaje específico con el motivo (si existe) y se indica contactar con administración si se considera un error.
- Si administración suspende/elimina una cuenta que estaba abierta, la app cierra la sesión y conserva el mensaje para mostrarlo en la pantalla de ingreso.

### Cuenta reactivada
- Al reactivar desde Administración se marca una bienvenida pendiente.
- En el siguiente ingreso aparece una pantalla modal “¡Bienvenido de nuevo!” antes de continuar a la app.
- Al pulsar Continuar se confirma la bienvenida y no vuelve a aparecer en futuros inicios de sesión.

### Verificación del proveedor
- Se corrigió la re-solicitud después de que Administración rechaza o retira una verificación.
- Una nueva solicitud vuelve correctamente a estado `pendiente`.
- Se eliminan la fecha/observación de la resolución anterior para no mezclar una revisión nueva con la anterior.
- La regla permite la transición desde cualquier estado no pendiente siempre que el perfil no esté verificado, manteniendo inmutables los datos sensibles del proveedor.

## Archivos a reemplazar
- `src/App.tsx`
- `src/components/TabPerfil.tsx`
- `src/components/TabAdmin.tsx`
- `src/state/databaseService.ts`
- `src/types.ts`
- `firestore.rules`

## Después de copiar

```powershell
npm run firebase:rules
npm run build
npx cap sync android
```

Para abrir Android Studio:

```powershell
npx cap open android
```

No es necesario modificar JDK, Gradle, SDK ni Capacitor.
