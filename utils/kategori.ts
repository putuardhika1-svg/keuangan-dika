export const JENIS_TRANSAKSI = ['Pemasukan', 'Pengeluaran', 'Hutang', 'Piutang'] as const;

export type JenisTransaksi = (typeof JENIS_TRANSAKSI)[number];

export const KATEGORI: Record<JenisTransaksi, string[]> = {
  Pemasukan: ['Gaji', 'Bonus', 'Hasil Usaha', 'Investasi', 'Pemberian', 'Lainnya'],
  Pengeluaran: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Lainnya'],
  Hutang: ['Pinjaman Bank', 'Pinjaman Teman', 'Kredit Barang', 'Lainnya'],
  Piutang: ['Dipinjam Teman', 'Tagihan Klien', 'Lainnya'],
};

export function isJenisTransaksi(value: unknown): value is JenisTransaksi {
  return typeof value === 'string' && (JENIS_TRANSAKSI as readonly string[]).includes(value);
}

export function isKategoriValid(jenis: JenisTransaksi, kategori: string): boolean {
  return KATEGORI[jenis].includes(kategori);
}

export function kategoriAman(jenis: JenisTransaksi, kategori: string): string {
  return isKategoriValid(jenis, kategori) ? kategori : 'Lainnya';
}
