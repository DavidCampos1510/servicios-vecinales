import type { Proveedor } from './types';

/** Comparte datos profesionales; URL solo cuando hay un dominio HTTPS publicado. */
export async function shareProviderProfile(proveedor: Proveedor): Promise<string> {
  let profileUrl = '';
  const publicBase = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (publicBase) {
    try {
      const url = new URL(publicBase);
      if (url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        url.searchParams.set('provider', proveedor.id);
        profileUrl = url.toString();
      }
    } catch { /* No compartir enlaces inválidos. */ }
  }
  const message = [
    'Te comparto este perfil profesional en Servicios Vecinales:',
    proveedor.nombre_publico || proveedor.oficio,
    `Especialidad: ${proveedor.oficio}`,
    proveedor.ubicacion ? `Ubicación: ${proveedor.ubicacion}` : '',
    profileUrl,
  ].filter(Boolean).join('\n');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Perfil - Servicios Vecinales', text: message });
      return profileUrl ? 'Perfil compartido.' : 'Información compartida. El enlace público estará disponible al publicar la web.';
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) window.location.href = whatsappUrl;
    return profileUrl ? 'Abriendo WhatsApp para compartir.' : 'Se compartirá la información del proveedor; aún falta configurar un enlace público.';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return '';
    return 'No fue posible compartir el perfil. Inténtalo nuevamente.';
  }
}
