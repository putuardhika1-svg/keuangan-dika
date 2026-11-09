"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { JENIS_TRANSAKSI, KATEGORI, kategoriAman, isJenisTransaksi, type JenisTransaksi } from "@/utils/kategori";
import { buatId, formatRupiah, pesanError } from "@/utils/format";
import { kompresGambar } from "@/utils/kompres-gambar";
import type { RincianBarang } from "@/utils/types";
import { Camera, Loader2, Save, ArrowLeft, Trash2, Upload, PlusCircle } from "lucide-react";

const UKURAN_MAKS_FILE = 8 * 1024 * 1024;

export default function TambahTransaksi() {
  const router = useRouter();

  // State Form Manual
  const [jenis, setJenis] = useState<JenisTransaksi>("Pengeluaran");
  const [kategori, setKategori] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState("");

  // State Baru untuk Data Tambahan dari Struk
  const [keterangan, setKeterangan] = useState(""); // Untuk Nama Toko
  const [metodePembayaran, setMetodePembayaran] = useState("");
  const [rincianBarang, setRincianBarang] = useState<RincianBarang[]>([]);
  const [fileStruk, setFileStruk] = useState<File | null>(null);

  // State Loading & AI
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  useEffect(() => {
    const sekarang = new Date();
    const lokal = new Date(sekarang.getTime() - sekarang.getTimezoneOffset() * 60000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tanggal awal mengikuti zona waktu browser
    setTanggal(lokal.toISOString().split("T")[0]);
  }, []);

  const opsiKategori = KATEGORI;

  // 1. FUNGSI SUBMIT TRANSAKSI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nominalAngka = Math.round(Number(nominal));
    if (!Number.isFinite(nominalAngka) || nominalAngka <= 0) {
      alert("Nominal harus berupa angka lebih dari 0.");
      return;
    }
    if (!kategori || !opsiKategori[jenis].includes(kategori)) {
      alert("Pilih kategori yang sesuai dengan jenis transaksi.");
      return;
    }
    if (!tanggal) {
      alert("Tanggal transaksi wajib diisi.");
      return;
    }

    const rincianBersih = rincianBarang.filter(
      (item) => item.nama.trim().length > 0 && item.qty > 0,
    );

    setLoadingSubmit(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        router.push("/login");
        return;
      }

      let buktiFoto: string | null = null;

      if (fileStruk) {
        const ekstensi = fileStruk.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const pathFoto = `${session.user.id}/${buatId()}.${ekstensi}`;
        const { error: errorUpload } = await supabase.storage
          .from("bukti-struk")
          .upload(pathFoto, fileStruk, {
            contentType: fileStruk.type || "image/jpeg",
            upsert: false,
          });

        if (errorUpload) {
          console.error("Gagal mengunggah foto struk:", errorUpload.message);
          const lanjutTanpaFoto = window.confirm(
            "Foto struk gagal diunggah. Pastikan bucket 'bukti-struk' sudah dibuat (jalankan migration Supabase).\n\nSimpan transaksi tanpa foto?",
          );
          if (!lanjutTanpaFoto) return;
        } else {
          buktiFoto = pathFoto;
        }
      }

      // Insert ke Supabase sesuai dengan skema tabel
      const { error } = await supabase
        .from("transaksi")
        .insert([
          {
            id: buatId(),
            jenis,
            kategori,
            jumlah: nominalAngka,
            tanggal,
            keterangan: keterangan.trim() || "-", // Fallback wajib diisi
            metode_pembayaran: metodePembayaran.trim() || null,
            detail_barang: rincianBersih.length > 0 ? JSON.stringify(rincianBersih) : null,
            bukti_foto: buktiFoto,
            user_id: session.user.id
          }
        ]);

      if (error) throw error;

      alert("Transaksi berhasil disimpan!");
      router.push("/");
      router.refresh();

    } catch (error) {
      const pesan = pesanError(error, "Gagal menyimpan transaksi.");
      console.error("Gagal menyimpan transaksi:", pesan);
      alert("Terjadi kesalahan saat menyimpan transaksi: " + pesan);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // 2. FUNGSI SCAN STRUK
  const handleScanStruk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileAsli = e.target.files?.[0];
    if (!fileAsli) return;

    if (!fileAsli.type.startsWith("image/")) {
      alert("File harus berupa gambar struk.");
      e.target.value = "";
      return;
    }

    setLoadingScan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");

      const file = await kompresGambar(fileAsli);
      if (file.size > UKURAN_MAKS_FILE) {
        throw new Error("Ukuran gambar terlalu besar. Maksimal 8 MB.");
      }
      setFileStruk(file);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/scan-struk", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Gagal API (Status: ${response.status})`);
      }

      const data = await response.json();

      // Auto-fill data ke state frontend
      if (data.nominal) setNominal(String(data.nominal));
      if (data.kategori) setKategori(kategoriAman("Pengeluaran", String(data.kategori)));
      if (data.tanggal) setTanggal(String(data.tanggal));
      if (data.nama_toko) setKeterangan(`Belanja di ${String(data.nama_toko).trim()}`);
      if (data.metode_pembayaran) setMetodePembayaran(String(data.metode_pembayaran));
      if (Array.isArray(data.rincian_barang)) {
        setRincianBarang(
          data.rincian_barang
            .map((item: unknown) => {
              const data = (item ?? {}) as { nama?: unknown; qty?: unknown; harga?: unknown };
              return {
                nama: String(data.nama ?? "").trim(),
                qty: Math.max(Math.round(Number(data.qty) || 1), 1),
                harga: Math.max(Math.round(Number(data.harga) || 0), 0),
              };
            })
            .filter((item: RincianBarang) => item.nama.length > 0)
        );
      }

      if (isJenisTransaksi(data.jenis)) {
        setJenis(data.jenis);
      } else {
        setJenis("Pengeluaran");
      }

      alert("Struk berhasil dipindai! Periksa kembali data sebelum menyimpan.");
    } catch (error) {
      const pesan = pesanError(error, "Gagal membaca struk.");
      console.error("Error scanning struk:", pesan);
      const layananSibuk = /503|high demand|overloaded|unavailable/i.test(pesan);
      alert(
        layananSibuk
          ? "Layanan Google Gemini sedang sibuk. Foto tetap terlampir; silakan isi data secara manual atau coba scan lagi beberapa menit."
          : "Gagal membaca struk. Foto tetap terlampir, silakan isi data secara manual atau coba scan lagi.\n\nAlasan: " + pesan,
      );
    } finally {
      setLoadingScan(false);
      e.target.value = '';
    }
  };

  const ubahRincian = (index: number, field: keyof RincianBarang, value: string) => {
    setRincianBarang((sebelumnya) =>
      sebelumnya.map((item, i) => {
        if (i !== index) return item;
        if (field === "nama") return { ...item, nama: value };
        if (field === "qty") return { ...item, qty: Math.max(Math.round(Number(value) || 0), 0) };
        return { ...item, harga: Math.max(Math.round(Number(value) || 0), 0) };
      }),
    );
  };

  const tambahRincian = () => {
    setRincianBarang((sebelumnya) => [...sebelumnya, { nama: "", qty: 1, harga: 0 }]);
  };

  const hapusRincian = (index: number) => {
    setRincianBarang((sebelumnya) => sebelumnya.filter((_, i) => i !== index));
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
            <h1 className="mt-0.5 font-serif text-xl leading-tight">Catat transaksi</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
        <p className="max-w-lg text-sm leading-relaxed text-muted">
          Satu catatan sehari sudah cukup. Mulai dari nominal, lalu lengkapi bila perlu.
        </p>

        <section className="mt-6 rounded-xl border border-dashed border-line p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Dari foto struk</p>
              <p className="mt-1 text-sm text-ink">Ambil foto langsung atau unggah file struk dari galeri.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent ${loadingScan ? "pointer-events-none opacity-60" : ""}`}>
                {loadingScan ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {loadingScan ? "Membaca struk..." : "Ambil foto"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanStruk} disabled={loadingScan} />
              </label>
              <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent ${loadingScan ? "pointer-events-none opacity-60" : ""}`}>
                {loadingScan ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {loadingScan ? "Membaca struk..." : "Upload file"}
                <input type="file" accept="image/*" className="hidden" onChange={handleScanStruk} disabled={loadingScan} />
              </label>
            </div>
          </div>

          {fileStruk && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="truncate font-mono text-[11px] text-muted">{fileStruk.name}</p>
              <button type="button" onClick={() => setFileStruk(null)} className="shrink-0 text-xs font-medium text-negative hover:underline">
                Hapus foto
              </button>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Jenis</legend>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {JENIS_TRANSAKSI.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setJenis(item); setKategori(""); }}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    jenis === item
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="nominal" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nominal</label>
            <div className="mt-2 flex items-baseline gap-2 border-b border-line pb-2 transition-colors focus-within:border-accent">
              <span className="font-mono text-sm text-muted">Rp</span>
              <input
                id="nominal"
                type="number"
                required
                min={1}
                step={1}
                inputMode="numeric"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="0"
                className="angka w-full bg-transparent font-mono text-4xl leading-none tracking-tight text-ink outline-none placeholder:text-line sm:text-5xl"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="kategori" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Kategori</label>
              <select
                id="kategori"
                required
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="" disabled>Pilih kategori</option>
                {opsiKategori[jenis].map((kat) => (
                  <option key={kat} value={kat}>{kat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tanggal" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tanggal</label>
              <input
                id="tanggal"
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
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
              placeholder="Contoh: makan siang, bensin, gaji"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="metode" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Metode pembayaran</label>
            <input
              id="metode"
              type="text"
              list="metode-pembayaran"
              value={metodePembayaran}
              onChange={(e) => setMetodePembayaran(e.target.value)}
              placeholder="Tunai, QRIS, transfer..."
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <datalist id="metode-pembayaran">
              <option value="Tunai" />
              <option value="Kartu Debit" />
              <option value="Kartu Kredit" />
              <option value="QRIS" />
              <option value="E-Wallet" />
              <option value="Transfer Bank" />
            </datalist>
          </div>

          <section className="rounded-lg border border-line">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Rincian barang</p>
                <p className="mt-0.5 text-xs text-muted">Opsional, bisa diisi manual atau dari hasil scan.</p>
              </div>
              <button type="button" onClick={tambahRincian} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
                <PlusCircle size={14} /> Tambah item
              </button>
            </div>

            {rincianBarang.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">Belum ada rincian barang.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rincianBarang.map((item, index) => (
                  <li key={index} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_70px_110px_32px] sm:items-end">
                    <div>
                      <label htmlFor={`rincian-nama-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Nama</label>
                      <input
                        id={`rincian-nama-${index}`}
                        type="text"
                        value={item.nama}
                        onChange={(e) => ubahRincian(index, "nama", e.target.value)}
                        placeholder="Nama barang"
                        className="mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor={`rincian-qty-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Qty</label>
                      <input
                        id={`rincian-qty-${index}`}
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
                      <label htmlFor={`rincian-harga-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Harga</label>
                      <input
                        id={`rincian-harga-${index}`}
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

            {rincianBarang.length > 0 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-sm font-medium">Total rincian</span>
                <span className="angka font-mono text-sm font-medium">
                  {formatRupiah(rincianBarang.reduce((total, item) => total + item.qty * item.harga, 0))}
                </span>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
            <Link href="/" className="text-sm text-muted transition-colors hover:text-ink">Batal</Link>
            <button
              type="submit"
              disabled={loadingSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loadingSubmit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loadingSubmit ? "Menyimpan..." : "Simpan transaksi"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
