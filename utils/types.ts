export type Transaksi = {
  id: string;
  user_id?: string | null;
  jenis: string;
  kategori: string;
  jumlah: number | string;
  keterangan?: string | null;
  tanggal: string;
  metode_pembayaran?: string | null;
  detail_barang?: string | null;
  bukti_foto?: string | null;
};

export type Anggaran = {
  kategori: string;
  batas: number;
};

export type RincianBarang = {
  nama: string;
  qty: number;
  harga: number;
};

export type PesanChat = {
  sender: "bot" | "user";
  teks: string;
};
