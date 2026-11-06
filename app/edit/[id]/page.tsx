"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { JENIS_TRANSAKSI, KATEGORI, kategoriAman, isJenisTransaksi, type JenisTransaksi } from '@/utils/kategori';
import { formatRupiah, pesanError as ambilPesanError, toNumber } from '@/utils/format';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

type RincianBarang = { nama: string; qty: number; harga: number };

export default function EditTransaksi() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idTransaksi = params.id;

  const [siap, setSiap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const [jenis, setJenis] = useState<JenisTransaksi>("Pengeluaran");
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [metodePembayaran, setMetodePembayaran] = useState("");
  const [detailBarang, setDetailBarang] = useState<string | null>(null);

  useEffect(() => {
    const tarikDataLama = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }

        const { data, error } = await supabase
          .from('transaksi')
          .select('id, jenis, kategori, jumlah, keterangan, tanggal, metode_pembayaran, detail_barang')
          .eq('id', idTransaksi)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setPesanError("Transaksi tidak ditemukan atau bukan milik akun ini.");
          return;
        }

        const jenisData: JenisTransaksi = isJenisTransaksi(data.jenis) ? data.jenis : "Pengeluaran";

        setJenis(jenisData);
        setKategori(kategoriAman(jenisData, String(data.kategori ?? "")));
        setJumlah(String(toNumber(data.jumlah)));
        setKeterangan(String(data.keterangan ?? ""));
        setTanggal(String(data.tanggal ?? ""));
        setMetodePembayaran(String(data.metode_pembayaran ?? ""));
        setDetailBarang(data.detail_barang ?? null);
        setSiap(true);
      } catch (error) {
        setPesanError(ambilPesanError(error, "Gagal memuat transaksi."));
      } finally {
        setLoading(false);
      }
    };

    if (idTransaksi) tarikDataLama();
  }, [idTransaksi, router]);

  const ubahJenis = (jenisBaru: JenisTransaksi) => {
    setJenis(jenisBaru);
    if (!KATEGORI[jenisBaru].includes(kategori)) {
      setKategori(KATEGORI[jenisBaru][0]);
    }
  };

  const simpanPerubahan = async (e: React.FormEvent) => {
    e.preventDefault();

    const jumlahAngka = Math.round(Number(jumlah));
    if (!Number.isFinite(jumlahAngka) || jumlahAngka <= 0) {
      alert("Jumlah harus berupa angka lebih dari 0.");
      return;
    }
    if (!kategori || !KATEGORI[jenis].includes(kategori)) {
      alert("Pilih kategori yang sesuai.");
      return;
    }
    if (!tanggal) {
      alert("Tanggal transaksi wajib diisi.");
      return;
    }

    setMenyimpan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const { error } = await supabase
        .from('transaksi')
        .update({
          jenis,
          kategori,
          jumlah: jumlahAngka,
          keterangan: keterangan.trim() || "-",
          tanggal,
          metode_pembayaran: metodePembayaran.trim() || null,
        })
        .eq('id', idTransaksi)
        .eq('user_id', session.user.id);

      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (error) {
      alert("Gagal mengupdate: " + ambilPesanError(error));
    } finally {
      setMenyimpan(false);
    }
  };

  const rincian: RincianBarang[] = (() => {
    if (!detailBarang) return [];
    try {
      const hasil = JSON.parse(detailBarang);
      if (!Array.isArray(hasil)) return [];
      return hasil
        .map((item: unknown) => {
          const data = (item ?? {}) as { nama?: unknown; qty?: unknown; harga?: unknown };
          return {
            nama: String(data.nama ?? ""),
            qty: toNumber(data.qty),
            harga: toNumber(data.harga),
          };
        })
        .filter((item) => item.nama.length > 0);
    } catch {
      return [];
    }
  })();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
          <Link href="/" aria-label="Kembali ke dashboard" className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Transaksi</h1>
        </div>

        {loading ? (
          <div className="text-center p-8 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat data...
          </div>
        ) : pesanError ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{pesanError}</div>
        ) : (
          <form onSubmit={simpanPerubahan} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Jenis</label>
                <select
                  value={jenis}
                  onChange={(e) => ubahJenis(e.target.value as JenisTransaksi)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
                >
                  {JENIS_TRANSAKSI.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
                >
                  {KATEGORI[jenis].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Jumlah (Rp)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Keterangan Catatan</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2">Metode Pembayaran</label>
                <input
                  type="text"
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value)}
                  placeholder="QRIS, Tunai..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
                />
              </div>
            </div>

            {rincian.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-sm font-semibold mb-2">Rincian Barang (dari scan struk)</p>
                <ul className="space-y-1.5">
                  {rincian.map((item, index) => (
                    <li key={`${item.nama}-${index}`} className="flex justify-between gap-3 text-sm">
                      <span className="truncate">{item.nama} <span className="text-xs text-slate-400">x{item.qty}</span></span>
                      <span className="shrink-0 font-medium">{formatRupiah(item.qty * item.harga)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-slate-200 dark:border-slate-600 pt-2 text-right text-sm font-bold">
                  Total: {formatRupiah(rincian.reduce((total, item) => total + item.qty * item.harga, 0))}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={menyimpan || !siap}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl mt-8 transition-colors shadow-lg disabled:opacity-70"
            >
              {menyimpan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {menyimpan ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
