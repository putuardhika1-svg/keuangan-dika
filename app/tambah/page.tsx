"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase"; 
import { Camera, Image as ImageIcon, Loader2, Save } from "lucide-react";

export default function TambahTransaksi() {
  const router = useRouter();

  // State Form Manual
  const [jenis, setJenis] = useState("Pengeluaran");
  const [kategori, setKategori] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState("");
  
  // State Baru untuk Data Tambahan dari Struk
  const [keterangan, setKeterangan] = useState(""); // Untuk Nama Toko
  const [metodePembayaran, setMetodePembayaran] = useState(""); 
  const [detailBarang, setDetailBarang] = useState(""); // Disimpan dalam bentuk JSON string

  // State Loading & AI
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0]);
  }, []);

  const opsiKategori = {
    Pemasukan: ["Gaji", "Bonus", "Hasil Usaha", "Lainnya"],
    Pengeluaran: ["Makanan", "Transportasi", "Tagihan", "Hiburan", "Belanja", "Lainnya"],
    Hutang: ["Pinjaman Bank", "Pinjaman Teman", "Kredit Barang", "Lainnya"],
    Piutang: ["Dipinjam Teman", "Tagihan Klien", "Lainnya"]
  };

  // 1. FUNGSI SUBMIT TRANSAKSI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        router.push("/login");
        return;
      }

      // Insert ke Supabase sesuai dengan skema tabel
      const { error } = await supabase
        .from("transaksi")
        .insert([
          {
            id: Date.now().toString(), 
            jenis: jenis,
            kategori: kategori,
            jumlah: parseFloat(nominal),
            tanggal: tanggal,
            keterangan: keterangan || "-", // Fallback wajib diisi
            metode_pembayaran: metodePembayaran || null,
            detail_barang: detailBarang || null,
            user_id: session.user.id
          }
        ]);

      if (error) throw error;

      alert("Transaksi berhasil disimpan!");
      router.push("/"); 
      router.refresh(); 

    } catch (error: any) {
      console.error("Gagal menyimpan transaksi:", error.message);
      alert("Terjadi kesalahan saat menyimpan transaksi: " + error.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // 2. FUNGSI SCAN STRUK
  const handleScanStruk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingScan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");

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
      if (data.nominal) setNominal(data.nominal.toString());
      if (data.kategori) setKategori(data.kategori);
      if (data.tanggal) setTanggal(data.tanggal);
      if (data.nama_toko) setKeterangan(`Belanja di ${data.nama_toko}`);
      if (data.metode_pembayaran) setMetodePembayaran(data.metode_pembayaran);
      if (data.rincian_barang) setDetailBarang(JSON.stringify(data.rincian_barang)); // Simpan array rincian sebagai teks
      
      setJenis("Pengeluaran");
      
      alert("Struk berhasil dipindai! Rincian barang otomatis tersimpan. Silakan periksa datanya sebelum disimpan.");
    } catch (error: any) {
      console.error("Error scanning struk:", error);
      alert("Gagal membaca struk! Alasan: " + error.message);
    } finally {
      setLoadingScan(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-800 dark:text-gray-100">
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-2xl font-bold">Tambah Transaksi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Catat aktivitas keuangan Anda hari ini.</p>
        </div>

        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
          <label className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 block">
            Isi Cepat dengan Scan Struk (Gemini AI)
          </label>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 py-3 rounded-xl cursor-pointer transition-colors">
              {loadingScan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span className="font-medium">{loadingScan ? "Membaca..." : "Pilih Foto Struk"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleScanStruk} disabled={loadingScan} />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div>
            <label className="block text-sm font-medium mb-2">Jenis Transaksi</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["Pemasukan", "Pengeluaran", "Hutang", "Piutang"].map((item) => (
                <button
                  key={item} type="button" onClick={() => { setJenis(item); setKategori(""); }}
                  className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${jenis === item ? "bg-blue-600 text-white border-blue-600" : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nominal (Rp)</label>
            <input type="number" required value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="Contoh: 50000" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <select required value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none">
              <option value="" disabled>Pilih Kategori...</option>
              {opsiKategori[jenis as keyof typeof opsiKategori].map((kat) => (
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
              <input type="text" value={metodePembayaran} onChange={(e) => setMetodePembayaran(e.target.value)} placeholder="QRIS, Tunai..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none" />
            </div>
          </div>

          <button type="submit" disabled={loadingSubmit} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors mt-4 disabled:opacity-70">
            {loadingSubmit ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : <><Save className="w-5 h-5" /> Simpan Transaksi</>}
          </button>
        </form>

      </div>
    </div>
  );
}