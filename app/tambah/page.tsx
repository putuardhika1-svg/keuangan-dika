"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { JENIS_TRANSAKSI, KATEGORI, kategoriAman, isJenisTransaksi, type JenisTransaksi } from "@/utils/kategori";
import { buatId, formatRupiah, pesanError } from "@/utils/format";
import { fileKeDataUrl, kompresGambar } from "@/utils/kompres-gambar";
import type { RincianBarang } from "@/utils/types";
import { Camera, Loader2, Save, ArrowLeft, Trash2 } from "lucide-react";

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

    setLoadingSubmit(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        router.push("/login");
        return;
      }

      let buktiFoto: string | null = null;
      let gagalUploadFoto = false;

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
          console.warn("Bucket storage belum siap, menyimpan foto di database:", errorUpload.message);
          if (fileStruk.size <= 1.5 * 1024 * 1024) {
            buktiFoto = await fileKeDataUrl(fileStruk);
          } else {
            gagalUploadFoto = true;
          }
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
            detail_barang: rincianBarang.length > 0 ? JSON.stringify(rincianBarang) : null,
            bukti_foto: buktiFoto,
            user_id: session.user.id
          }
        ]);

      if (error) throw error;

      alert(gagalUploadFoto
        ? "Transaksi berhasil disimpan, tetapi foto struk gagal diunggah."
        : "Transaksi berhasil disimpan!");
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
      alert("Gagal membaca struk! Alasan: " + pesan);
    } finally {
      setLoadingScan(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-800 dark:text-gray-100">
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-start gap-4">

          {/* Ini adalah tombol panah kembalinya */}
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Ini judul yang lama, sekarang posisinya di sebelah kanan panah */}
          <div>
            <h1 className="text-2xl font-bold">Tambah Transaksi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Catat aktivitas keuangan Anda hari ini.</p>
          </div>

        </div>

        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
          <label className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 block">
            Isi Cepat dengan Scan Struk (Gemini AI)
          </label>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 py-3 rounded-xl cursor-pointer transition-colors">
              {loadingScan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span className="font-medium">{loadingScan ? "Membaca..." : "Pilih Foto Struk"}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanStruk} disabled={loadingScan} />
            </label>
          </div>
          {fileStruk && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-gray-800/60 border border-blue-100 dark:border-blue-900 px-3 py-2 text-xs">
              <span className="truncate text-gray-600 dark:text-gray-300">Foto siap diunggah: {fileStruk.name}</span>
              <button type="button" onClick={() => setFileStruk(null)} className="shrink-0 font-semibold text-red-500 hover:text-red-600">
                Hapus
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          <div>
            <label className="block text-sm font-medium mb-2">Jenis Transaksi</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {JENIS_TRANSAKSI.map((item) => (
                <button
                  key={item} type="button" onClick={() => { setJenis(item); setKategori(""); }}
                  className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${jenis === item ? "bg-blue-600 text-white border-blue-600" : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nominal (Rp)</label>
            <input type="number" required min={1} step={1} inputMode="numeric" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="Contoh: 50000" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <select required value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none">
              <option value="" disabled>Pilih Kategori...</option>
              {opsiKategori[jenis].map((kat) => (
                <option key={kat} value={kat}>{kat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nama Toko / Keterangan</label>
            <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Misal: Indomaret" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tanggal</label>
              <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Metode Pembayaran</label>
              <input type="text" list="metode-pembayaran" value={metodePembayaran} onChange={(e) => setMetodePembayaran(e.target.value)} placeholder="QRIS, Tunai..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
              <datalist id="metode-pembayaran">
                <option value="Tunai" />
                <option value="Kartu Debit" />
                <option value="Kartu Kredit" />
                <option value="QRIS" />
                <option value="E-Wallet" />
                <option value="Transfer Bank" />
              </datalist>
            </div>
          </div>

          {rincianBarang.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Rincian Barang (hasil scan)</p>
                <button type="button" onClick={() => setRincianBarang([])} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
              <ul className="space-y-1.5">
                {rincianBarang.map((item, index) => (
                  <li key={`${item.nama}-${index}`} className="flex justify-between gap-3 text-sm">
                    <span className="truncate">
                      {item.nama} <span className="text-xs text-gray-400">x{item.qty}</span>
                    </span>
                    <span className="shrink-0 font-medium">{formatRupiah(item.qty * item.harga)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-gray-200 dark:border-gray-600 pt-2 text-right text-sm font-bold">
                Total: {formatRupiah(rincianBarang.reduce((total, item) => total + item.qty * item.harga, 0))}
              </p>
            </div>
          )}

          <button type="submit" disabled={loadingSubmit} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors mt-4 disabled:opacity-70">
            {loadingSubmit ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : <><Save className="w-5 h-5" /> Simpan Transaksi</>}
          </button>
        </form>

      </div>
    </div>
  );
}