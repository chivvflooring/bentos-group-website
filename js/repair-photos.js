export const MAX_PHOTOS = 5;
export const MAX_ORIGINAL_BYTES = 20_000_000;
export const MAX_PHOTO_BYTES = 600_000;

export async function preparePhoto(file) {
  // Re-encoding keeps the actual request small and removes original metadata.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    for (const maxDimension of [1600, 1120, 800]) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.68, 0.48]) {
        const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (photo?.size && photo.size <= MAX_PHOTO_BYTES) return photo;
      }
    }
    throw new Error('Photo could not be compressed.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
