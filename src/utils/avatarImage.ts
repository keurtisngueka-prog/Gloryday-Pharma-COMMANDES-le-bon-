const MAX_SOURCE_SIZE = 15 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = 300_000;

/** Crop and compress a client profile image before sending it to the API. */
export async function processAvatarFile(file: File, size = 256, quality = 0.82): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choisissez une image JPG, PNG ou WEBP.');
  }
  if (file.size <= 0 || file.size > MAX_SOURCE_SIZE) {
    throw new Error('La photo doit peser moins de 15 Mo.');
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Impossible de lire la photo sélectionnée.'));
    reader.onerror = () => reject(new Error('Erreur pendant la lecture de la photo.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Ce format d’image n’est pas pris en charge par cet appareil.'));
    element.src = source;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('La compression de la photo est indisponible sur cet appareil.');

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('Les dimensions de la photo sont invalides.');

  const side = Math.min(width, height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);

  let optimized = canvas.toDataURL('image/webp', quality);
  if (!optimized.startsWith('data:image/webp;')) optimized = canvas.toDataURL('image/jpeg', quality);
  if (optimized.length > MAX_AVATAR_DATA_URL_LENGTH) {
    optimized = canvas.toDataURL('image/jpeg', 0.68);
  }
  if (optimized.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error('La photo reste trop lourde après compression. Choisissez une image plus petite.');
  }
  return optimized;
}
