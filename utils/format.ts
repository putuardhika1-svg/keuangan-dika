export function formatRupiah(angka: number): string {
  const nilai = Number.isFinite(angka) ? angka : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(nilai);
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const teks = value.trim();
  if (!teks) return 0;

  const negatif = teks.includes('-');
  const angka = teks.replace(/[^\d,.]/g, '');
  if (!angka) return 0;

  const pemisahTerakhir = Math.max(angka.lastIndexOf(','), angka.lastIndexOf('.'));
  let bersih = angka;

  if (pemisahTerakhir !== -1) {
    const digitSetelahPemisah = angka.length - pemisahTerakhir - 1;

    if (digitSetelahPemisah > 0 && digitSetelahPemisah <= 2) {
      const depan = angka.slice(0, pemisahTerakhir).replace(/[.,]/g, '');
      const belakang = angka.slice(pemisahTerakhir + 1);
      bersih = `${depan}.${belakang}`;
    } else {
      bersih = angka.replace(/[.,]/g, '');
    }
  }

  const hasil = Number.parseFloat(bersih);
  if (!Number.isFinite(hasil)) return 0;
  return negatif ? -Math.abs(hasil) : hasil;
}

export function getBulanTahun(tanggalStr: string): string {
  if (!tanggalStr) return 'Lainnya';

  const teks = tanggalStr.trim();
  let tanggal: Date | null = null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(teks);
  if (iso) {
    tanggal = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  } else {
    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(teks);
    if (dmy) {
      tanggal = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    } else {
      tanggal = new Date(teks);
    }
  }

  if (!tanggal || Number.isNaN(tanggal.getTime())) return 'Lainnya';

  return tanggal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function pecahTanggal(tanggalStr: string): { hari: string; bulan: string } {
  const teks = (tanggalStr || "").trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(teks);
  if (iso) {
    const tanggal = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(tanggal.getTime())) {
      return {
        hari: String(tanggal.getDate()).padStart(2, "0"),
        bulan: tanggal.toLocaleDateString("id-ID", { month: "short" }).replace(".", "").toUpperCase(),
      };
    }
  }

  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(teks);
  if (dmy) {
    const tanggal = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!Number.isNaN(tanggal.getTime())) {
      return {
        hari: String(tanggal.getDate()).padStart(2, "0"),
        bulan: tanggal.toLocaleDateString("id-ID", { month: "short" }).replace(".", "").toUpperCase(),
      };
    }
  }

  return { hari: "—", bulan: "" };
}

export function daftarPeriode(tanggalList: string[]): string[] {
  const periode = new Set<string>();
  tanggalList.forEach((tanggal) => {
    const label = getBulanTahun(tanggal);
    if (label !== 'Lainnya') periode.add(label);
  });
  return Array.from(periode);
}

export function buatId(): string {
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sanitizeCsvCell(value: unknown): string {
  const teks = value == null ? '' : String(value);
  const aman = teks.replace(/\r?\n/g, ' ');
  const antiFormula = /^[=+\-@\t]/.test(aman) ? `'${aman}` : aman;
  return `"${antiFormula.replace(/"/g, '""')}"`;
}

export function getNamaTampilan(email?: string | null, nama?: string | null): string {
  if (nama && nama.trim()) return nama.trim();
  if (email && email.includes('@')) return email.split('@')[0];
  return 'Ardhika';
}

export function getInisial(nama: string): string {
  const bagian = nama
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (bagian.length === 0) return 'PA';
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return `${bagian[0][0]}${bagian[bagian.length - 1][0]}`.toUpperCase();
}

export function pesanError(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function terapkanTema(pilihan: string): void {
  const gelap = pilihan === 'gelap';
  document.documentElement.classList.toggle('dark', gelap);
  try {
    localStorage.setItem('tema', gelap ? 'gelap' : 'terang');
  } catch {
    // localStorage bisa diblokir; tema tetap berlaku untuk sesi ini.
  }
}
