# Parche 19 — Accesibilidad y modo oscuro

## Incluye
- Tema: Sistema / Claro / Oscuro.
- Preferencia local por dispositivo.
- Tamaño de texto Normal / Grande.
- Mejoras de contraste para fondos, bordes, textos, formularios y navegación en modo oscuro.
- Foco visible para teclado y tecnologías de asistencia.
- Respeta `prefers-reduced-motion` del sistema.
- Panel de accesibilidad disponible en Mi perfil y también antes de iniciar sesión.

## Firebase
No modifica Firestore ni sus reglas.

## Instalación
Reemplazar/copiar:
- `src/App.tsx`
- `src/components/TabPerfil.tsx`
- `src/components/AccessibilityPreferencesPanel.tsx`
- `src/state/accessibilityPreferences.ts`

Luego ejecutar:
```
npm run build
npx cap sync android
npx cap open android
```
