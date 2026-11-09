"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { JENIS_TRANSAKSI, KATEGORI, kategoriAman, isJenisTransaksi, type JenisTransaksi } from '@/utils/kategori';
import { buatId, formatRupiah, pesanError as ambilPesanError, toNumber } from '@/utils/format';
import { kompresGambar } from '@/utils/kompres-gambar';
import type { RincianBarang } from '@/utils/types';
import { ArrowLeft, Camera, Loader2, PlusCircle, Save, Trash2, Upload } from 'lucide-react';

const UKURAN_MAKS_FILE = 8 * 1024 * 1024;
const POLA_URL = /^(https?:|data:|blob:)/;

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
  const [rincian, setRincian] = useState<RincianBarang[]>([]);
  const [detailMentah, setDetailMentah] = useState<string | null>(null);
  const [detailArray, setDetailArray] = useState(false);

  const [buktiFoto, setBuktiFoto] = useState<string | null>(null);
  const [urlBukti, setUrlBukti] = useState<string | null>(null);
  const [pesanFoto, setPesanFoto] = useState("");
  const [fileBaru, setFileBaru] = useState<File | null>(null);
  const [previewBaru, setPreviewBaru] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);

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
          .select('id, jenis, kategori, jumlah, keterangan, tanggal, metode_pembayaran, detail_barang, bukti_foto')
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

        const detail = data.detail_barang;
        if (detail) {
          try {
            const hasil = JSON.parse(detail);
            if (Array.isArray(hasil)) {
              setDetailArray(true);
              setRincian(
                hasil
                  .map((item: unknown) => {
                    const isi = (item ?? {}) as { nama?: unknown; qty?: unknown; harga?: unknown };
                    return {
                      nama: String(isi.nama ?? "").trim(),
                      qty: Math.max(toNumber(isi.qty), 0),
                      harga: Math.max(toNumber(isi.harga), 0),
                    };
                  })
                  .filter((item) => item.nama.length > 0),
              );
            } else {
              setDetailMentah(String(detail));
            }
          } catch {
            setDetailMentah(String(detail));
          }
        }

        const bukti = data.bukti_foto;
        setBuktiFoto(bukti ?? null);
        setHapusFoto(false);

        if (bukti) {
          if (POLA_URL.test(bukti)) {
            setUrlBukti(bukti);
          } else {
            const { data: signed, error: errorSigned } = await supabase.storage
              .from('bukti-struk')
              .createSignedUrl(bukti, 3600);
            if (errorSigned) {
              console.warn("Gagal memuat foto struk:", errorSigned.message);
              setPesanFoto("Gagal memuat foto. Anda tetap bisa mengganti atau menghapusnya.");
            } else if (signed?.signedUrl) {
              setUrlBukti(signed.signedUrl);
            } else {
              setPesanFoto("Foto struk tidak ditemukan di penyimpanan.");
            }
          }
        }

        setSiap(true);
      } catch (error) {
        setPesanError(ambilPesanError(error, "Gagal memuat transaksi."));
      } finally {
        setLoading(false);
      }
    };

    if (idTransaksi) tarikDataLama();
  }, [idTransaksi, router]);

  useEffect(() => {
    if (!previewBaru) return;
    return () => URL.revokeObjectURL(previewBaru);
  }, [previewBaru]);

  const ubahJenis = (jenisBaru: JenisTransaksi) => {
    setJenis(jenisBaru);
    if (!KATEGORI[jenisBaru].includes(kategori)) {
      setKategori(KATEGORI[jenisBaru][0]);
    }
  };

  const pilihFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileAsli = e.target.files?.[0];
    e.target.value = "";
    if (!fileAsli) return;

    if (!fileAsli.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      return;
    }

    try {
      const file = await kompresGambar(fileAsli);
      if (file.size > UKURAN_MAKS_FILE) {
        alert("Ukuran gambar terlalu besar. Maksimal 8 MB.");
        return;
      }
      setFileBaru(file);
      setPreviewBaru(URL.createObjectURL(file));
      setPesanFoto("");
      setHapusFoto(false);
    } catch (error) {
      alert("Gagal membaca gambar: " + ambilPesanError(error));
    }
  };

  const batalkanFoto = () => {
    setFileBaru(null);
    setPreviewBaru(null);
    setHapusFoto(true);
    setUrlBukti(null);
    setPesanFoto("");
  };

  const ubahRincian = (index: number, field: keyof RincianBarang, value: string) => {
    setRincian((sebelumnya) =>
      sebelumnya.map((item, i) => {
        if (i !== index) return item;
        if (field === "nama") return { ...item, nama: value };
        if (field === "qty") return { ...item, qty: Math.max(Math.round(Number(value) || 0), 0) };
        return { ...item, harga: Math.max(Math.round(Number(value) || 0), 0) };
      }),
    );
  };

  const tambahRincian = () => {
    setRincian((sebelumnya) => [...sebelumnya, { nama: "", qty: 1, harga: 0 }]);
  };

  const hapusRincian = (index: number) => {
    setRincian((sebelumnya) => sebelumnya.filter((_, i) => i !== index));
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

      let buktiBaru = buktiFoto;
      if (hapusFoto && !fileBaru) {
        buktiBaru = null;
      }

      if (fileBaru) {
        const ekstensi = fileBaru.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const pathFoto = `${session.user.id}/${buatId()}.${ekstensi}`;
        const { error: errorUpload } = await supabase.storage
          .from("bukti-struk")
          .upload(pathFoto, fileBaru, {
            contentType: fileBaru.type || "image/jpeg",
            upsert: false,
          });

        if (errorUpload) {
          throw new Error(
            "Gagal mengunggah foto struk. Pastikan bucket 'bukti-struk' sudah dibuat. " + errorUpload.message,
          );
        }
        buktiBaru = pathFoto;
      }

      const rincianBersih = rincian.filter((item) => item.nama.trim().length > 0 && item.qty > 0);
      const detailBaru = rincianBersih.length > 0
        ? JSON.stringify(rincianBersih)
        : detailArray
          ? null
          : detailMentah;

      const { error } = await supabase
        .from('transaksi')
        .update({
          jenis,
          kategori,
          jumlah: jumlahAngka,
          keterangan: keterangan.trim() || "-",
          tanggal,
          metode_pembayaran: metodePembayaran.trim() || null,
          detail_barang: detailBaru,
          bukti_foto: buktiBaru,
        })
        .eq('id', idTransaksi)
        .eq('user_id', session.user.id);

      if (error) {
        if (fileBaru && buktiBaru) {
          await supabase.storage.from('bukti-struk').remove([buktiBaru]);
        }
        throw error;
      }

      const buktiLama = buktiFoto;
      if (buktiLama && !POLA_URL.test(buktiLama) && (hapusFoto || fileBaru)) {
        const { error: errorHapus } = await supabase.storage.from('bukti-struk').remove([buktiLama]);
        if (errorHapus) console.warn("Gagal menghapus foto lama:", errorHapus.message);
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      alert("Gagal mengupdate: " + ambilPesanError(error));
    } finally {
      setMenyimpan(false);
    }
  };

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

            <section className="rounded-lg border border-line">
              <div className="border-b border-line px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Foto struk</p>
                <p className="mt-0.5 text-xs text-muted">Ganti atau hapus bukti foto transaksi ini.</p>
              </div>
              <div className="px-4 py-4">
                {previewBaru || urlBukti ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview lokal / signed URL Supabase
                  <img
                    src={previewBaru ?? urlBukti ?? ""}
                    alt="Bukti struk"
                    className="max-h-72 w-full rounded-md border border-line object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted">{pesanFoto || "Belum ada foto struk."}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent">
                    <Upload size={14} /> {previewBaru || urlBukti ? "Ganti foto" : "Upload foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={pilihFoto} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent">
                    <Camera size={14} /> Ambil foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pilihFoto} />
                  </label>
                  {(previewBaru || urlBukti) && (
                    <button
                      type="button"
                      onClick={batalkanFoto}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-medium text-negative transition-colors hover:border-negative"
                    >
                      <Trash2 size={14} /> Hapus foto
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-line">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Rincian barang</p>
                  <p className="mt-0.5 text-xs text-muted">Opsional, bisa dikoreksi manual.</p>
                </div>
                <button type="button" onClick={tambahRincian} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
                  <PlusCircle size={14} /> Tambah item
                </button>
              </div>

              {rincian.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">
                  {detailMentah ?? "Belum ada rincian barang."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {rincian.map((item, index) => (
                    <li key={index} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_70px_110px_32px] sm:items-end">
                      <div>
                        <label htmlFor={`edit-rincian-nama-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Nama</label>
                        <input
                          id={`edit-rincian-nama-${index}`}
                          type="text"
                          value={item.nama}
                          onChange={(e) => ubahRincian(index, "nama", e.target.value)}
                          placeholder="Nama barang"
                          className="mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-rincian-qty-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Qty</label>
                        <input
                          id={`edit-rincian-qty-${index}`}
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={item.qty}
                          onChange={(e) => ubahRincian(index, "qty", e.target.value)}
                          className="angka mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-rincian-harga-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Harga</label>
                        <input
                          id={`edit-rincian-harga-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={item.harga}
                          onChange={(e) => ubahRincian(index, "harga", e.target.value)}
                          className="angka mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => hapusRincian(index)}
                        aria-label={`Hapus ${item.nama || `item ${index + 1}`}`}
                        className="flex h-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper hover:text-negative"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {rincian.length > 0 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <span className="text-sm font-medium">Total rincian</span>
                  <span className="angka font-mono text-sm font-medium">
                    {formatRupiah(rincian.reduce((total, item) => total + item.qty * item.harga, 0))}
                  </span>
                </div>
              )}
            </section>

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
