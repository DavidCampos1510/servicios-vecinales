const PROFILE_PHOTO_KEY_PREFIX = 'sv_profile_photo_v1_';
const PROFILE_PHOTO_EVENT = 'sv-profile-photo-updated';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const OUTPUT_SIZE = 320;
const JPEG_QUALITY = 0.78;

function storageKey(userId: string): string {
  return `${PROFILE_PHOTO_KEY_PREFIX}${userId}`;
}

export function getLocalProfilePhoto(userId: string | null | undefined): string {
  if (!userId || typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(storageKey(userId)) || '';
  } catch {
    return '';
  }
}

export function saveLocalProfilePhoto(userId: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), dataUrl);
  } catch {
    throw new Error('No fue posible guardar la foto en este dispositivo. Prueba con otra imagen o libera espacio de almacenamiento.');
  }
  window.dispatchEvent(new CustomEvent(PROFILE_PHOTO_EVENT, { detail: { userId } }));
}

export function removeLocalProfilePhoto(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Si el almacenamiento está bloqueado, simplemente mantenemos el fallback visual.
  }
  window.dispatchEvent(new CustomEvent(PROFILE_PHOTO_EVENT, { detail: { userId } }));
}

export function subscribeLocalProfilePhoto(listener: (userId?: string) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ userId?: string }>;
    listener(customEvent.detail?.userId);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PROFILE_PHOTO_KEY_PREFIX)) {
      listener(event.key.slice(PROFILE_PHOTO_KEY_PREFIX.length));
    }
  };

  window.addEventListener(PROFILE_PHOTO_EVENT, onCustomEvent);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(PROFILE_PHOTO_EVENT, onCustomEvent);
    window.removeEventListener('storage', onStorage);
  };
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
    image.src = dataUrl;
  });
}

export async function prepareLocalProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La imagen es demasiado grande. El máximo permitido antes de comprimir es 10 MB.');
  }

  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImage(originalDataUrl);

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!sourceSize) {
    throw new Error('No fue posible procesar la imagen seleccionada.');
  }

  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('El dispositivo no pudo preparar la foto de perfil.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
