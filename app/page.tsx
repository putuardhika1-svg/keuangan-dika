"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Trash2, Plus, Edit, Search, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend } from 'recharts';
// Ini import yang sudah diperbaiki
import { supabase } from '@/utils/supabase';

export default function Home() {
  const [daftarTransaksi, setDaftarTransaksi] = useState<any[]>([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);

  const [sapaan, setSapaan] = useState("Halo");
  const [kataKunci, setKataKunci] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [sedangMemuat, setSedangMemuat] = useState(true);

  const muatData = async () => {
    setSedangMemuat(true);
    const { data, error } = await supabase
      .from('transaksi')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Gagal menarik data:", error.message);
    } else if (data) {
      let hitungPemasukan = 0;
      let hitungPengeluaran = 0;

      data.forEach((transaksi: any) => {
        if (transaksi.jenis === 'Pemasukan') hitungPemasukan += transaksi.jumlah;
        else hitungPengeluaran += transaksi.jumlah;
      });

      setTotalPemasukan(hitungPemasukan);
      setTotalPengeluaran(hitungPengeluaran);
      setTotalSaldo(hitungPemasukan - hitungPengeluaran);
      setDaftarTransaksi(data);
    }
    setSedangMemuat(false);
  };

  useEffect(() => {
    muatData();
    const jam = new Date().getHours();
    if (jam < 11) setSapaan("Selamat Pagi");
    else if (jam < 15) setSapaan("Selamat Siang");
    else if (jam < 18) setSapaan("Selamat Sore");
    else setSapaan("Selamat Malam");
  }, []);

  const hapusTransaksi = async (idYangDihapus: string) => {
    if (!window.confirm("Yakin ingin menghapus riwayat ini?")) return;
    const { error } = await supabase.from('transaksi').delete().eq('id', idYangDihapus);
    if (error) alert("Gagal menghapus: " + error.message);
    else muatData();
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  const unduhCSV = () => {
    if (daftarTransaksi.length === 0) return alert("Belum ada data untuk diunduh.");
    let csvContent = "Tanggal,Jenis,Kategori,Keterangan,Jumlah (Rp)\n";
    daftarTransaksi.forEach(t => {
      csvContent += `"${t.tanggal}","${t.jenis}","${t.kategori}","${t.keterangan}",${t.jumlah}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "laporan_keuangan_dika.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const transaksiYangDitampilkan = daftarTransaksi.filter((item) => {
    const cocokJenis = filterJenis === "Semua" ? true : item.jenis === filterJenis;
    const cocokPencarian = item.keterangan.toLowerCase().includes(kataKunci.toLowerCase());
    return cocokJenis && cocokPencarian;
  });

  const prosesDataGrafik = () => {
    const pengeluaranSaja = daftarTransaksi.filter(t => t.jenis === "Pengeluaran");
    const rekapKategori: { [key: string]: number } = {};
    pengeluaranSaja.forEach(t => {
      if (rekapKategori[t.kategori]) rekapKategori[t.kategori] += t.jumlah;
      else rekapKategori[t.kategori] = t.jumlah;
    });
    return Object.keys(rekapKategori).map(kategori => ({ name: kategori, value: rekapKategori[kategori] }));
  };

  const dataGrafik = prosesDataGrafik();
  const WARNA_GRAFIK = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{sapaan}, Dika! 👋</h1>
            <p className="text-slate-500 mt-1">Laporan keuanganmu siap dianalisis.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={unduhCSV} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 md:py-3 md:px-4 rounded-xl transition-all flex items-center justify-center gap-2">
              <Download size={20} />
              <span className="hidden md:inline">Unduh Laporan</span>
            </button>
            <Link href="/tambah" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-xl transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2">
              <Plus size={20} />
              <span className="hidden md:inline">Tambah Transaksi</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-blue-600 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <Wallet className="absolute right-[-10px] top-[-10px] opacity-20" size={100} />
            <h2 className="text-blue-100 font-medium mb-1">Total Saldo Saat Ini</h2>
            <p className="text-3xl md:text-4xl font-bold">{formatRupiah(totalSaldo)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <ArrowUpCircle size={28} />
            </div>
            <div>
              <h2 className="text-slate-500 font-medium mb-1">Pemasukan</h2>
              <p className="text-2xl font-bold text-slate-800">{formatRupiah(totalPemasukan)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-500">
              <ArrowDownCircle size={28} />
            </div>
            <div>
              <h2 className="text-slate-500 font-medium mb-1">Pengeluaran</h2>
              <p className="text-2xl font-bold text-slate-800">{formatRupiah(totalPengeluaran)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">Riwayat Transaksi</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" placeholder="Cari transaksi..." value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 text-sm" />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {["Semua", "Pemasukan", "Pengeluaran"].map((tab) => (
                  <button key={tab} onClick={() => setFilterJenis(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${filterJenis === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {sedangMemuat ? (
              <div className="text-center py-10 text-slate-500 font-medium animate-pulse">Menghubungkan ke Cloud...</div>
            ) : transaksiYangDitampilkan.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-30" />
                <p>Tidak ada transaksi. Ayo mulai menabung!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transaksiYangDitampilkan.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row md:justify-between md:items-center p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all group">
                    <div className="flex gap-4 items-center">
                      <div className={`p-3 rounded-full ${item.jenis === 'Pemasukan' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {item.jenis === 'Pemasukan' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">{item.keterangan}</p>
                        <div className="flex gap-2 text-sm text-slate-500 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-medium">{item.kategori || 'Lainnya'}</span>
                          <span>•</span>
                          <span>{item.tanggal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 mt-4 md:mt-0 w-full md:w-auto">
                      <div className={`text-xl font-bold mr-2 ${item.jenis === 'Pemasukan' ? 'text-green-600' : 'text-slate-800'}`}>
                        {item.jenis === 'Pemasukan' ? '+' : '-'} {formatRupiah(item.jumlah)}
                      </div>
                      <Link href={`/edit/${item.id}`} className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Edit">
                        <Edit size={20} />
                      </Link>
                      <button onClick={() => hapusTransaksi(item.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all" title="Hapus">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {dataGrafik.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Analisis Pengeluaran (Berdasarkan Kategori)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataGrafik} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {dataGrafik.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={WARNA_GRAFIK[index % WARNA_GRAFIK.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: any) => formatRupiah(Number(value))} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}