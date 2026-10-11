# Ajuste perfil y disponibilidad — parche 04B

Este parche se aplica DESPUÉS del parche 04 de Disponibilidad.

## Correcciones

1. El horario ahora siempre se muestra en el perfil público del proveedor.
   - Si existe un horario guardado, se muestra tal cual.
   - Si aún no existe, se muestra `Horario por coordinar`.
   - Si el proveedor está marcado como no disponible y no hay horario, se muestra `Sin horario disponible`.

2. Para estados Disponible ahora / Disponible hoy / Con agenda, el proveedor debe indicar un horario o referencia antes de guardar.

3. En `Mi perfil` del proveedor también se muestra el horario bajo la disponibilidad.

4. Se corrigió el solapamiento al hacer scroll.
   - La barra verde superior queda siempre por encima de la foto y el contenido.
   - El contenido ya no se dibuja sobre el encabezado.
   - Se evita desplazamiento horizontal accidental.

## Archivos a reemplazar

- `src/components/TabInicio.tsx`
- `src/components/TabPerfil.tsx`

No cambia Firestore, por lo que NO es necesario publicar reglas nuevamente.

Después de copiar:

```powershell
npm run build
npx cap sync android
```

Luego ejecutar desde Android Studio con Run.
