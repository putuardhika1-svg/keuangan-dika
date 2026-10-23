"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Ini import yang sudah diperbaiki
import { supabase } from '@/utils/supabase';

export default function TambahTransaksi() {
    const router = useRouter();
    const [jenis, setJenis] = useState("Pengeluaran");
    const [kategori, setKategori] = useState("Makanan");
    const [jumlah, setJumlah] = useState("");
    const [keterangan, setKeterangan] = useState("");

    const opsiPengeluaran = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
    const opsiPemasukan = ["Gaji", "Bonus", "Investasi", "Pemberian", "Lainnya"];

    const simpanData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jumlah || !keterangan) {
            alert("Mohon isi jumlah dan keterangan terlebih dahulu!");
            return;
        }

        const transaksiBaru = {
            id: Date.now().toString(),
            jenis: jenis,
            kategori: kategori,
            jumlah: parseInt(jumlah),
            keterangan: keterangan,
            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        };

        const { error } = await supabase.from('transaksi').insert([transaksiBaru]);

        if (error) {
            alert("Gagal menyimpan ke database: " + error.message);
            return;
        }

        router.push('/');
    };

    const tanganiUbahJenis = (jenisBaru: string) => {
        setJenis(jenisBaru);
        setKategori(jenisBaru === "Pengeluaran" ? "Makanan" : "Gaji");
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold text-slate-800">Catat Transaksi</h1>
                    <Link href="/" className="text-slate-500 hover:text-slate-800 font-medium">Batal</Link>
                </div>
                <form onSubmit={simpanData} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">Jenis</label>
                            <select value={jenis} onChange={(e) => tanganiUbahJenis(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="Pengeluaran">Pengeluaran</option>
                                <option value="Pemasukan">Pemasukan</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-medium mb-2">Kategori</label>
                            <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                                {jenis === "Pengeluaran" ? opsiPengeluaran.map(k => <option key={k} value={k}>{k}</option>) : opsiPemasukan.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-medium mb-2">Jumlah (Rp)</label>
                        <input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="Contoh: 50000" className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-slate-700 font-medium mb-2">Keterangan Catatan</label>
                        <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Contoh: Beli nasi padang" className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl mt-8 transition-colors shadow-lg shadow-blue-200">
                        Simpan Transaksi
                    </button>
                </form>
            </div>
        </main>
    );
}