export function fileKeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function bacaGambar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const gambar = new Image();
      gambar.onload = () => resolve(gambar);
      gambar.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
      gambar.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export async function kompresGambar(
  file: File,
  maxDimensi = 1600,
  kualitas = 0.82,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= 800 * 1024) return file;

  try {
    const gambar = await bacaGambar(file);
    const skala = Math.min(1, maxDimensi / Math.max(gambar.width, gambar.height));
    if (skala === 1 && file.size <= 1.5 * 1024 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(gambar.width * skala);
    canvas.height = Math.round(gambar.height * skala);

    const konteks = canvas.getContext('2d');
    if (!konteks) return file;

    konteks.drawImage(gambar, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', kualitas);
    });

    if (!blob) return file;

    const namaBaru = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
    return new File([blob], namaBaru, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
