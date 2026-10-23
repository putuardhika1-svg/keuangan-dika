"use client";

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';

export default function TambahTransaksi() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State dasar
    const [jenis, setJenis] = useState("Pengeluaran");
    const [kategori, setKategori] = useState("Makanan");
    const [sedangScan, setSedangScan] = useState(false);
    const [buktiFoto, setBuktiFoto] = useState("");

    // State untuk 5 Poin Utama
    const [namaToko, setNamaToko] = useState("");
    const [tanggalWaktu, setTanggalWaktu] = useState("");
    const [totalNominal, setTotalNominal] = useState("");
    const [rincianBarang, setRincianBarang] = useState("");
    const [metodePembayaran, setMetodePembayaran] = useState("Tunai");

    const opsiPengeluaran = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
    const opsiPemasukan = ["Gaji", "Bonus", "Investasi", "Pemberian", "Lainnya"];
    const opsiPembayaran = ["Tunai", "Kartu Debit", "Kartu Kredit", "QRIS", "E-wallet", "Transfer Bank", "Tidak diketahui"];

    const simpanData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totalNominal || !namaToko) return alert("Mohon isi Total Nominal dan Nama Toko!");

        const transaksiBaru = {
            id: Date.now().toString(),
            jenis: jenis,
            kategori: kategori,
            keterangan: namaToko,       // Menggunakan kolom keterangan untuk Nama Toko
            jumlah: parseInt(totalNominal),
            tanggal: tanggalWaktu,      // Menyimpan data tanggal & waktu dari struk
            detail_barang: rincianBarang,
            metode_pembayaran: metodePembayaran,
            bukti_foto: buktiFoto,
        };

        const { error } = await supabase.from('transaksi').insert([transaksiBaru]);
        if (error) return alert("Gagal menyimpan: " + error.message);
        router.push('/');
    };

    const tanganiScanStruk = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSedangScan(true);

        // 1. Upload Foto
        const namaFile = `struk-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('struk').upload(namaFile, file);
        if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('struk').getPublicUrl(namaFile);
            setBuktiFoto(publicUrlData.publicUrl);
        }

        // 2. Scan AI
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const res = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: reader.result })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Gagal dari server");

                // Memasukkan 5 poin utama ke dalam form
                if (data.nama_toko) setNamaToko(data.nama_toko);
                if (data.tanggal_waktu) setTanggalWaktu(data.tanggal_waktu);
                if (data.total_nominal) setTotalNominal(data.total_nominal.toString());

                // Jika AI menemukan metode pembayaran, pastikan formatnya cocok atau gunakan default
                if (data.metode_pembayaran) {
                    const metode = data.metode_pembayaran;
                    if (opsiPembayaran.includes(metode)) setMetodePembayaran(metode);
                    else setMetodePembayaran("Tidak diketahui");
                }

                // Format Rincian Barang
                if (data.rincian_barang && Array.isArray(data.rincian_barang)) {
                    const teksBarang = data.rincian_barang.map((b: any) => `- ${b.nama} (${b.qty}x) : Rp${b.harga}`).join('\n');
                    setRincianBarang(teksBarang);
                }

                alert("Berhasil! 5 Informasi utama struk telah diekstrak.");
            } catch (err: any) {
                alert("Pesan Error: " + (err.message || "Gagal membaca struk"));
            } finally {
                setSedangScan(false);
            }
        };
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold text-slate-800">Catat Transaksi</h1>
                    <Link href="/" className="text-slate-500 hover:text-slate-800 font-medium">Batal</Link>
                </div>

                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={tanganiScanStruk} />

                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sedangScan} className="w-full mb-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 px-4 rounded-xl flex justify-center items-center gap-3 transition-colors shadow-lg">
                    {sedangScan ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
                    {sedangScan ? "AI Sedang Mengekstrak Data..." : "Scan Struk (Ekstrak 5 Poin Utama)"}
                </button>

                {buktiFoto && (
                    <div className="mb-6 flex items-center gap-3 bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
                        <ImageIcon size={20} />
                        <span className="text-sm font-medium">Bukti foto berhasil disimpan.</span>
                    </div>
                )}

                <form onSubmit={simpanData} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">1. Nama Toko / Merchant</label>
                            <input type="text" value={namaToko} onChange={(e) => setNamaToko(e.target.value)} placeholder="Misal: Indomaret" className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">2. Tanggal & Waktu</label>
                            <input type="text" value={tanggalWaktu} onChange={(e) => setTanggalWaktu(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">3. Total Nominal (Rp)</label>
                            <input type="number" value={totalNominal} onChange={(e) => setTotalNominal(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">5. Metode Pembayaran</label>
                            <select value={metodePembayaran} onChange={(e) => setMetodePembayaran(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                {opsiPembayaran.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 font-medium mb-2">4. Rincian Barang/Jasa</label>
                        <textarea value={rincianBarang} onChange={(e) => setRincianBarang(e.target.value)} rows={4} placeholder="Daftar item akan terisi otomatis..." className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                    </div>

                    {/* Kolom Kategori (Tetap dipertahankan untuk Chart di halaman depan) */}
                    <div className="border-t border-slate-200 pt-5 mt-5">
                        <label className="block text-slate-700 font-medium mb-2">Kategori (Untuk Laporan Grafik)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <select value={jenis} onChange={(e) => { setJenis(e.target.value); setKategori(e.target.value === "Pengeluaran" ? "Makanan" : "Gaji"); }} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none">
                                <option value="Pengeluaran">Pengeluaran</option>
                                <option value="Pemasukan">Pemasukan</option>
                            </select>
                            <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none">
                                {jenis === "Pengeluaran" ? opsiPengeluaran.map(k => <option key={k} value={k}>{k}</option>) : opsiPemasukan.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl mt-4 transition-colors shadow-lg shadow-blue-200">
                        Simpan Transaksi
                    </button>
                </form>
            </div>
        </main>
    );
}