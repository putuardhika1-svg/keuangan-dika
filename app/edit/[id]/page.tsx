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
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link href="/" aria-label="Kembali ke ringkasan" className="rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-ink">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Buku Kas</p>
            <h1 className="mt-0.5 font-serif text-xl leading-tight">Edit transaksi</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
          </div>
        ) : pesanError ? (
          <div className="border-l-2 border-negative pl-3 text-sm text-negative" role="alert">
            {pesanError}
          </div>
        ) : (
          <form onSubmit={simpanPerubahan} className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="jenis" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Jenis</label>
                <select
                  id="jenis"
                  value={jenis}
                  onChange={(e) => ubahJenis(e.target.value as JenisTransaksi)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                >
                  {JENIS_TRANSAKSI.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="kategori" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Kategori</label>
                <select
                  id="kategori"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                >
                  {KATEGORI[jenis].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="jumlah" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Jumlah</label>
              <div className="mt-2 flex items-baseline gap-2 border-b border-line pb-2 transition-colors focus-within:border-accent">
                <span className="font-mono text-sm text-muted">Rp</span>
                <input
                  id="jumlah"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  className="angka w-full bg-transparent font-mono text-4xl leading-none tracking-tight text-ink outline-none sm:text-5xl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="keterangan" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Keterangan</label>
              <input
                id="keterangan"
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="tanggal" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tanggal</label>
                <input
                  id="tanggal"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="metode" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Metode pembayaran</label>
                <input
                  id="metode"
                  type="text"
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value)}
                  placeholder="QRIS, Tunai..."
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                />
              </div>
            </div>

            {rincian.length > 0 && (
              <section className="rounded-lg border border-line">
                <div className="border-b border-line px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Rincian dari struk</p>
                </div>
                <ul className="divide-y divide-line">
                  {rincian.map((item, index) => (
                    <li key={`${item.nama}-${index}`} className="flex items-start justify-between gap-4 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{item.nama}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted">{item.qty} × {formatRupiah(item.harga)}</span>
                      </span>
                      <span className="angka shrink-0 font-mono text-sm">{formatRupiah(item.qty * item.harga)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <span className="text-sm font-medium">Total rincian</span>
                  <span className="angka font-mono text-sm font-medium">
                    {formatRupiah(rincian.reduce((total, item) => total + item.qty * item.harga, 0))}
                  </span>
                </div>
              </section>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
              <Link href="/" className="text-sm text-muted transition-colors hover:text-ink">Batal</Link>
              <button
                type="submit"
                disabled={menyimpan || !siap}
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {menyimpan ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
