"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend } from 'recharts';
import { Plus, X, Receipt, Image as ImageIcon, CreditCard, Calendar, Wallet, ArrowDownCircle, ArrowUpCircle, LogOut, User, Shield, Download, Palette } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  const [transaksi, setTransaksi] = useState<any[]>([]);
  const [transaksiTerpilih, setTransaksiTerpilih] = useState<any>(null);
  const [filterAktif, setFilterAktif] = useState("Semua");
  const [sapaan, setSapaan] = useState("Halo");
  
  const [menuProfilBuka, setMenuProfilBuka] = useState(false);
  const [userEmail, setUserEmail] = useState("dika@email.com");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const cekLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        const user = session.user;
        if (user.email) setUserEmail(user.email);
        
        // Pengecekan Tema Gelap/Terang dari Metadata User
        if (user.user_metadata?.tema === 'gelap') {
          setIsDarkMode(true);
          document.documentElement.classList.add('dark');
        } else {
          setIsDarkMode(false);
          document.documentElement.classList.remove('dark');
        }

        fetchData();
      }
    };
    
    cekLogin();
    
    const jam = new Date().getHours();
    if (jam >= 4 && jam < 11) setSapaan("Selamat Pagi");
    else if (jam >= 11 && jam < 15) setSapaan("Selamat Siang");
    else if (jam >= 15 && jam < 19) setSapaan("Selamat Sore");
    else setSapaan("Selamat Malam");
  }, [router]);

  const fetchData = async () => {
    const { data } = await supabase.from('transaksi').select('*').order('id', { ascending: false }).limit(20);
    if (data) setTransaksi(data);
  };

  const tanganiLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const totalPemasukan = transaksi.filter(t => t.jenis === 'Pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalPengeluaran = transaksi.filter(t => t.jenis === 'Pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const dataPengeluaran = transaksi.filter(t => t.jenis === 'Pengeluaran');
  const kategoriGrup = dataPengeluaran.reduce((acc: any, curr: any) => {
    acc[curr.kategori] = (acc[curr.kategori] || 0) + curr.jumlah;
    return acc;
  }, {});
  
  const dataGrafik = Object.keys(kategoriGrup).map(kategori => ({
    name: kategori,
    value: kategoriGrup[kategori]
  }));
  const WARNA = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6'];

  const transaksiDifilter = transaksi.filter(t => {
    if (filterAktif === "Semua") return true;
    return t.jenis === filterAktif;
  });

  return (
    <main className={`min-h-screen p-4 md:p-8 pb-24 relative transition-colors ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER SAPAAN & MENU PROFIL DROPDOWN */}
        <div className="flex items-center justify-between pt-2 relative z-40">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{sapaan}, Dika! 👋</h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Semoga laporan keuanganmu selalu sehat.</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setMenuProfilBuka(!menuProfilBuka)}
              className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl shadow-sm border border-blue-200 transition-transform hover:scale-105 focus:outline-none"
            >
              D
            </button>

            {menuProfilBuka && (
              <div className="fixed inset-0 z-40" onClick={() => setMenuProfilBuka(false)}></div>
            )}

            {menuProfilBuka && (
              <div className={`absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl border py-2 z-50 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                
                <div className={`px-4 py-3 border-b mb-2 rounded-t-2xl ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                  <p className="text-sm font-bold">Dika / Ardika</p>
                  <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{userEmail}</p>
                </div>

                <Link href="/pengaturan" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-600'}`}>
                  <User size={18} className="text-slate-400" /> Profil & Akun
                </Link>
                <Link href="/pengaturan" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-600'}`}>
                  <Shield size={18} className="text-slate-400" /> Keamanan & Privasi
                </Link>
                <Link href="/pengaturan" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-600'}`}>
                  <Download size={18} className="text-slate-400" /> Cadangan & Ekspor
                </Link>
                <Link href="/pengaturan" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-600'}`}>
                  <Palette size={18} className="text-slate-400" /> Tampilan (Tema)
                </Link>

                <div className={`h-px my-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                <button 
                  onClick={tanganiLogout} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={18} /> Keluar Aplikasi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KARTU TOTAL SALDO */}
        <div className={`rounded-3xl p-6 md:p-8 shadow-xl ${isDarkMode ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-slate-800 text-white'}`}>
          <p className="text-slate-300 font-medium mb-1">Total Saldo Anda</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{formatRupiah(saldo)}</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-300 mb-1">
                <ArrowDownCircle size={18} className="text-green-400" />
                <span className="text-sm">Pemasukan</span>
              </div>
              <p className="text-lg font-semibold text-green-400">+{formatRupiah(totalPemasukan)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-300 mb-1">
                <ArrowUpCircle size={18} className="text-red-400" />
                <span className="text-sm">Pengeluaran</span>
              </div>
              <p className="text-lg font-semibold text-red-400">-{formatRupiah(totalPengeluaran)}</p>
            </div>
          </div>
        </div>

        {/* GRAFIK PENGELUARAN */}
        {dataGrafik.length > 0 && (
          <div className={`p-6 rounded-3xl shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <h2 className="text-lg font-bold mb-4">Grafik Pengeluaran</h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataGrafik} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {dataGrafik.map((entry, index) => <Cell key={`cell-${index}`} fill={WARNA[index % WARNA.length]} />)}
                  </Pie>
                  <ChartTooltip formatter={(value: any) => formatRupiah(Number(value))} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* RIWAYAT TRANSAKSI & FILTER */}
        <div className={`p-6 rounded-3xl shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold">Riwayat Transaksi</h2>
            <div className={`p-1 rounded-xl flex ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button onClick={() => setFilterAktif("Semua")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterAktif === "Semua" ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-400 hover:text-slate-200'}`}>
                Semua
              </button>
              <button onClick={() => setFilterAktif("Pengeluaran")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterAktif === "Pengeluaran" ? "bg-red-500 text-white shadow-sm" : 'text-slate-400 hover:text-slate-200'}`}>
                Pengeluaran
              </button>
              <button onClick={() => setFilterAktif("Pemasukan")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterAktif === "Pemasukan" ? "bg-green-500 text-white shadow-sm" : 'text-slate-400 hover:text-slate-200'}`}>
                Pemasukan
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {transaksiDifilter.length === 0 ? (
              <p className={`text-center py-8 rounded-2xl border border-dashed ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                Tidak ada data {filterAktif !== "Semua" ? filterAktif.toLowerCase() : ""} untuk ditampilkan.
              </p>
            ) : (
              transaksiDifilter.map((t) => (
                <div key={t.id} onClick={() => setTransaksiTerpilih(t)} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${t.jenis === 'Pemasukan' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {t.jenis === 'Pemasukan' ? <Wallet size={24} /> : <Receipt size={24} />}
                    </div>
                    <div>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{t.keterangan || t.kategori}</h3>
                      <p className="text-xs text-slate-400">{t.tanggal} • {t.metode_pembayaran || "Tunai"}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${t.jenis === 'Pemasukan' ? 'text-green-400' : (isDarkMode ? 'text-white' : 'text-slate-800')}`}>
                    {t.jenis === 'Pemasukan' ? '+' : '-'}{formatRupiah(t.jumlah)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* TOMBOL FLOATING TAMBAH */}
      <Link href="/tambah" className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-400 transition-transform hover:scale-110 z-30">
        <Plus size={32} />
      </Link>

      {/* SLIDE DRAWER / MODAL DETAIL TRANSAKSI */}
      {transaksiTerpilih && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className={`w-full md:w-[450px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
            <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h2 className="text-xl font-bold">Detail Transaksi</h2>
              <button onClick={() => setTransaksiTerpilih(null)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className={`text-center p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-slate-400 mb-1">{transaksiTerpilih.keterangan}</p>
                <h3 className={`text-3xl font-bold ${transaksiTerpilih.jenis === 'Pemasukan' ? 'text-green-400' : ''}`}>
                  {formatRupiah(transaksiTerpilih.jumlah)}
                </h3>
                <span className={`inline-block mt-3 px-3 py-1 border rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {transaksiTerpilih.kategori}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Tanggal & Waktu</p>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{transaksiTerpilih.tanggal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Metode Pembayaran</p>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{transaksiTerpilih.metode_pembayaran || "Tidak diketahui"}</p>
                  </div>
                </div>
              </div>
              {transaksiTerpilih.detail_barang && (
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Receipt size={18} /> Rincian Belanja
                  </h4>
                  <div className={`p-4 rounded-xl border whitespace-pre-line text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                    {transaksiTerpilih.detail_barang}
                  </div>
                </div>
              )}
              {transaksiTerpilih.bukti_foto && (
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <ImageIcon size={18} /> Foto Bukti / Struk
                  </h4>
                  <img src={transaksiTerpilih.bukti_foto} alt="Bukti Struk" className={`w-full rounded-xl border shadow-sm ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}