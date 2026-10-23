"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { User, Shield, Download, Palette, ArrowLeft, Save, Loader2, Lock, Mail, Phone, Type, LogOut, CheckCircle2, Monitor, FileSpreadsheet, Sun, Moon } from 'lucide-react';

export default function Pengaturan() {
    const router = useRouter();

    const [tabAktif, setTabAktif] = useState("profil");

    const [email, setEmail] = useState("");
    const [nama, setNama] = useState("");
    const [telepon, setTelepon] = useState("");
    const [passwordBaru, setPasswordBaru] = useState("");

    const [tema, setTema] = useState("terang");

    const [loading, setLoading] = useState(false);
    const [loadingEkspor, setLoadingEkspor] = useState(false);
    const [pesan, setPesan] = useState({ tipe: "", teks: "" });

    useEffect(() => {
        const ambilDataUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
            } else {
                const user = session.user;
                setEmail(user.email || "");
                if (user.user_metadata) {
                    setNama(user.user_metadata.nama || "Dika");
                    setTelepon(user.user_metadata.telepon || "");
                    if (user.user_metadata.tema) {
                        setTema(user.user_metadata.tema);
                        document.documentElement.classList.toggle('dark', user.user_metadata.tema === 'gelap');
                    }
                }
            }
        };
        ambilDataUser();
    }, [router]);

    const simpanProfil = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setPesan({ tipe: "", teks: "" });

        try {
            const { error: errorMeta } = await supabase.auth.updateUser({
                data: { nama: nama, telepon: telepon, tema: tema }
            });
            if (errorMeta) throw errorMeta;

            if (passwordBaru.trim() !== "") {
                const { error: errorPass } = await supabase.auth.updateUser({
                    password: passwordBaru
                });
                if (errorPass) throw errorPass;
                setPasswordBaru("");
            }

            setPesan({ tipe: "sukses", teks: "Profil dan pengaturan berhasil diperbarui!" });
        } catch (error: any) {
            setPesan({ tipe: "error", teks: error.message || "Gagal memperbarui profil." });
        } finally {
            setLoading(false);
            setTimeout(() => setPesan({ tipe: "", teks: "" }), 3000);
        }
    };

    const tanganiLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const eksporKeCSV = async () => {
        setLoadingEkspor(true);
        try {
            const { data, error } = await supabase.from('transaksi').select('*');
            if (error) throw error;

            if (!data || data.length === 0) {
                alert("Belum ada data transaksi untuk diekspor.");
                setLoadingEkspor(false);
                return;
            }

            const headers = ["ID", "Jenis", "Kategori", "Jumlah", "Keterangan (Toko)", "Tanggal", "Metode Pembayaran", "Rincian Barang", "Bukti Foto"];
            const rows = data.map((t: any) => [
                t.id,
                t.jenis,
                t.kategori,
                t.jumlah,
                `"${(t.keterangan || "").replace(/"/g, '""')}"`,
                `"${t.tanggal || ""}"`,
                `"${t.metode_pembayaran || ""}"`,
                `"${(t.detail_barang || "").replace(/\n/g, ' ').replace(/"/g, '""')}"`,
                `"${t.bukti_foto || ""}"`
            ]);

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `laporan-keuangan-dika-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert("Gagal mengunduh data: " + err.message);
        } finally {
            setLoadingEkspor(false);
        }
    };

    // FUNGSI UTAMA: Mengubah tema secara instan
    const ubahTema = async (pilihanTema: string) => {
        setTema(pilihanTema);

        // Menerapkan kelas 'dark' pada HTML browser secara langsung
        if (pilihanTema === 'gelap') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Menyimpan preferensi ke Supabase
        await supabase.auth.updateUser({
            data: { nama: nama, telepon: telepon, tema: pilihanTema }
        });
    };

    return (
        <main className={`min-h-screen p-4 md:p-8 pb-24 transition-colors ${tema === 'gelap' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <div className="max-w-4xl mx-auto">

                {/* Header Kembali */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className={`p-3 rounded-full shadow-sm border transition-colors ${tema === 'gelap' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className={`text-2xl font-bold ${tema === 'gelap' ? 'text-white' : 'text-slate-800'}`}>Pengaturan</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* SIDEBAR MENU (Kiri) */}
                    <div className="md:col-span-1 space-y-2">
                        <button onClick={() => setTabAktif("profil")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${tabAktif === "profil" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : tema === 'gelap' ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}>
                            <User size={20} /> Profil & Akun
                        </button>
                        <button onClick={() => setTabAktif("keamanan")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${tabAktif === "keamanan" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : tema === 'gelap' ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}>
                            <Shield size={20} /> Keamanan
                        </button>
                        <button onClick={() => setTabAktif("cadangan")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${tabAktif === "cadangan" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : tema === 'gelap' ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}>
                            <Download size={20} /> Ekspor Data
                        </button>
                        <button onClick={() => setTabAktif("tampilan")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${tabAktif === "tampilan" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : tema === 'gelap' ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}>
                            <Palette size={20} /> Tampilan
                        </button>
                    </div>

                    {/* KONTEN PENGATURAN (Kanan) */}
                    <div className={`md:col-span-3 p-6 md:p-8 rounded-3xl shadow-sm border transition-colors ${tema === 'gelap' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>

                        {/* --- TAB: PROFIL --- */}
                        {tabAktif === "profil" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold">Profil & Akun</h2>
                                    <p className={`text-sm ${tema === 'gelap' ? 'text-slate-400' : 'text-slate-500'}`}>Kelola informasi pribadi dan kata sandi Anda.</p>
                                </div>

                                {pesan.teks && (
                                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${pesan.tipe === 'sukses' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {pesan.teks}
                                    </div>
                                )}

                                <form onSubmit={simpanProfil} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={`block font-medium mb-2 text-sm ${tema === 'gelap' ? 'text-slate-300' : 'text-slate-700'}`}>Nama Lengkap / Panggilan</label>
                                            <div className="relative">
                                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Misal: Dika" className={`w-full border rounded-xl p-3 pl-10 outline-none ${tema === 'gelap' ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500'}`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={`block font-medium mb-2 text-sm ${tema === 'gelap' ? 'text-slate-300' : 'text-slate-700'}`}>Nomor Telepon (Opsional)</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="text" value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="08..." className={`w-full border rounded-xl p-3 pl-10 outline-none ${tema === 'gelap' ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block font-medium mb-2 text-sm ${tema === 'gelap' ? 'text-slate-300' : 'text-slate-700'}`}>Alamat Email (Login)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="email" value={email} disabled className={`w-full border rounded-xl p-3 pl-10 cursor-not-allowed outline-none ${tema === 'gelap' ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`} />
                                        </div>
                                    </div>

                                    <div className={`pt-4 border-t ${tema === 'gelap' ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <label className={`block font-medium mb-2 text-sm ${tema === 'gelap' ? 'text-slate-300' : 'text-slate-700'}`}>Ganti Kata Sandi (Password)</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="password" value={passwordBaru} onChange={(e) => setPasswordBaru(e.target.value)} placeholder="Biarkan kosong jika tidak ingin mengubah sandi" className={`w-full border rounded-xl p-3 pl-10 outline-none ${tema === 'gelap' ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500'}`} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">Minimal 6 karakter.</p>
                                    </div>

                                    <button type="submit" disabled={loading} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {loading ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* --- TAB: KEAMANAN --- */}
                        {tabAktif === "keamanan" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold">Keamanan & Privasi</h2>
                                    <p className={`text-sm ${tema === 'gelap' ? 'text-slate-400' : 'text-slate-500'}`}>Pantau status perlindungan dan sesi perangkat Anda.</p>
                                </div>

                                <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-start gap-4">
                                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={24} />
                                    <div>
                                        <h4 className="font-bold text-green-900 text-sm">Akun Dilindungi Supabase Auth</h4>
                                        <p className="text-green-700 text-xs mt-0.5">Seluruh data transaksi dan foto struk Anda dienkripsi dengan standar keamanan tingkat tinggi.</p>
                                    </div>
                                </div>

                                <div className={`border rounded-2xl p-5 space-y-4 ${tema === 'gelap' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <h3 className="font-bold text-sm flex items-center gap-2">
                                        <Monitor size={18} className="text-slate-400" /> Sesi Perangkat Saat Ini
                                    </h3>
                                    <div className={`flex justify-between items-center p-4 rounded-xl border ${tema === 'gelap' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                                        <div>
                                            <p className="text-sm font-bold">Browser Aktif (Web Session)</p>
                                            <p className="text-xs text-slate-400">Login dengan email: {email}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                            Aman & Terhubung
                                        </span>
                                    </div>
                                </div>

                                <div className={`pt-4 border-t ${tema === 'gelap' ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <h3 className="font-bold text-sm mb-2">Keluar Jarak Jauh</h3>
                                    <p className={`text-sm mb-4 ${tema === 'gelap' ? 'text-slate-400' : 'text-slate-500'}`}>Gunakan tombol ini jika Anda ingin mengakhiri sesi aktif di perangkat ini secara instan.</p>
                                    <button onClick={tanganiLogout} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-6 rounded-xl transition-colors text-sm flex items-center gap-2 border border-red-200">
                                        <LogOut size={18} /> Akhiri Sesi & Keluar Sekarang
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- TAB: CADANGAN --- */}
                        {tabAktif === "cadangan" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold">Cadangan & Ekspor Data</h2>
                                    <p className={`text-sm ${tema === 'gelap' ? 'text-slate-400' : 'text-slate-500'}`}>Unduh seluruh catatan keuangan Anda untuk arsip pribadi atau analisis.</p>
                                </div>

                                <div className={`border p-5 rounded-2xl flex items-center justify-between gap-4 ${tema === 'gelap' ? 'bg-blue-950/40 border-blue-900/50' : 'bg-blue-50 border-blue-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                                            <FileSpreadsheet size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Unduh Laporan (Format CSV / Excel)</h4>
                                            <p className={`text-xs mt-0.5 ${tema === 'gelap' ? 'text-blue-300' : 'text-slate-500'}`}>Mencakup nama toko, tanggal, total nominal, rincian barang, hingga tautan foto struk.</p>
                                        </div>
                                    </div>

                                    <button onClick={eksporKeCSV} disabled={loadingEkspor} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl transition-colors shadow-lg flex items-center gap-2 shrink-0 text-sm">
                                        {loadingEkspor ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                        {loadingEkspor ? "Memproses..." : "Unduh Laporan"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- TAB: TAMPILAN --- */}
                        {tabAktif === "tampilan" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold">Pengaturan Tampilan</h2>
                                    <p className={`text-sm ${tema === 'gelap' ? 'text-slate-400' : 'text-slate-500'}`}>Pilih tema antarmuka aplikasi sesuai kenyamanan Anda.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => ubahTema("terang")}
                                        className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${tema === 'terang' ? 'border-blue-600 bg-blue-50/50 text-blue-600 ring-2 ring-blue-100' : tema === 'gelap' ? 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Sun size={28} />
                                        <span className="font-bold text-sm">Mode Terang (Light)</span>
                                    </button>

                                    <button
                                        onClick={() => ubahTema("gelap")}
                                        className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${tema === 'gelap' ? 'border-blue-600 bg-blue-900/40 text-white ring-2 ring-blue-500/30' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Moon size={28} />
                                        <span className="font-bold text-sm">Mode Gelap (Dark)</span>
                                    </button>
                                </div>

                                <p className="text-xs text-slate-400 mt-2">Preferensi tema Anda otomatis tersimpan di dalam profil akun Supabase.</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </main>
    );
}