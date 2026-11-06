"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { daftarPeriode, getBulanTahun, getNamaTampilan, pesanError, sanitizeCsvCell, terapkanTema, toNumber } from '@/utils/format';
import type { Transaksi } from '@/utils/types';
import { User, Shield, Download, Palette, ArrowLeft, Save, Loader2, LogOut, CheckCircle2, Monitor, FileSpreadsheet, Sun, Moon, CalendarDays, ChevronDown } from 'lucide-react';

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

    // STATE BARU: Untuk filter bulan ekspor
    const [semuaTransaksi, setSemuaTransaksi] = useState<Pick<Transaksi, "tanggal">[]>([]);
    const [filterBulanEkspor, setFilterBulanEkspor] = useState("Semua Waktu");

    useEffect(() => {
        const ambilDataUserDanTransaksi = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
            } else {
                const user = session.user;
                setEmail(user.email || "");
                const namaUser = getNamaTampilan(user.email, user.user_metadata?.nama);
                setNama(namaUser);
                setTelepon(user.user_metadata?.telepon || "");

                const temaUser = user.user_metadata?.tema || localStorage.getItem('tema') || "terang";
                setTema(temaUser);
                terapkanTema(temaUser);

                // Mengambil transaksi hanya untuk mendapatkan daftar bulan
                const { data } = await supabase
                    .from('transaksi')
                    .select('tanggal')
                    .eq('user_id', session.user.id);
                if (data) setSemuaTransaksi(data);
            }
        };
        ambilDataUserDanTransaksi();
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

            terapkanTema(tema);
            setPesan({ tipe: "sukses", teks: "Profil dan pengaturan berhasil diperbarui!" });
        } catch (error) {
            setPesan({ tipe: "error", teks: pesanError(error, "Gagal memperbarui profil.") });
        } finally {
            setLoading(false);
            setTimeout(() => setPesan({ tipe: "", teks: "" }), 3000);
        }
    };

    const tanganiLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const ubahTema = async (pilihanTema: string) => {
        setTema(pilihanTema);
        terapkanTema(pilihanTema);
        await supabase.auth.updateUser({
            data: { tema: pilihanTema }
        });
    };

    const daftarPeriodeTersedia = daftarPeriode(semuaTransaksi.map((t) => String(t.tanggal ?? "")));

    // FUNGSI EKSPOR TERBARU (DENGAN FILTER BULAN)
    const eksporKeCSV = async () => {
        setLoadingEkspor(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
                return;
            }

            const { data, error } = await supabase
                .from('transaksi')
                .select('id, jenis, kategori, jumlah, keterangan, tanggal, metode_pembayaran, detail_barang')
                .eq('user_id', session.user.id)
                .order('tanggal', { ascending: false })
                .order('id', { ascending: false });
            if (error) throw error;

            if (!data || data.length === 0) {
                alert("Belum ada data transaksi untuk diekspor.");
                return;
            }

            // Filter data sesuai pilihan dropdown
            const semuaData = data as Transaksi[];
            const dataDifilter = filterBulanEkspor === "Semua Waktu"
                ? semuaData
                : semuaData.filter((t) => getBulanTahun(String(t.tanggal ?? "")) === filterBulanEkspor);

            if (dataDifilter.length === 0) {
                alert(`Tidak ada transaksi yang tercatat pada periode: ${filterBulanEkspor}`);
                return;
            }

            const headers = ["ID", "Jenis", "Kategori", "Jumlah", "Keterangan (Toko)", "Tanggal", "Metode Pembayaran", "Rincian Barang"];
            const rows = dataDifilter.map((t) => [
                sanitizeCsvCell(t.id),
                sanitizeCsvCell(t.jenis),
                sanitizeCsvCell(t.kategori),
                sanitizeCsvCell(toNumber(t.jumlah)),
                sanitizeCsvCell(t.keterangan),
                sanitizeCsvCell(t.tanggal),
                sanitizeCsvCell(t.metode_pembayaran),
                sanitizeCsvCell(t.detail_barang),
            ]);

            const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(","), ...rows.map(e => e.join(","))].join("\r\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const labelFile = filterBulanEkspor === "Semua Waktu"
                ? "semua-waktu"
                : filterBulanEkspor.replace(/\s+/g, '-').toLowerCase();
            link.setAttribute("href", url);
            link.setAttribute("download", `laporan-keuangan-dika-${labelFile}.csv`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Gagal mengunduh data: " + pesanError(err));
        } finally {
            setLoadingEkspor(false);
        }
    };

    return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <Link href="/" aria-label="Kembali ke ringkasan" className="rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-ink">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Buku Kas</p>
            <h1 className="mt-0.5 font-serif text-xl leading-tight">Pengaturan</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[190px_1fr]">
          <nav className="hide-scrollbar flex gap-1 overflow-x-auto lg:flex-col" aria-label="Bagian pengaturan">
            {[
              { id: "profil", label: "Profil & akun", icon: User },
              { id: "keamanan", label: "Keamanan", icon: Shield },
              { id: "cadangan", label: "Ekspor data", icon: Download },
              { id: "tampilan", label: "Tampilan", icon: Palette },
            ].map((item) => {
              const Icon = item.icon;
              const aktif = tabAktif === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTabAktif(item.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    aktif ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </nav>

          <section className="min-w-0">
            {tabAktif === "profil" && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Profil</p>
                <h2 className="mt-2 font-serif text-2xl">Profil & akun</h2>
                <p className="mt-1 text-sm text-muted">Kelola nama, kontak, dan kata sandi Anda.</p>

                {pesan.teks && (
                  <div className={`mt-5 border-l-2 pl-3 text-sm ${pesan.tipe === "sukses" ? "border-positive text-positive" : "border-negative text-negative"}`} role="status">
                    {pesan.teks}
                  </div>
                )}

                <form onSubmit={simpanProfil} className="mt-6 space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="nama" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Nama panggilan</label>
                      <input
                        id="nama"
                        type="text"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Nama Anda"
                        className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor="telepon" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Nomor telepon</label>
                      <input
                        id="telepon"
                        type="text"
                        value={telepon}
                        onChange={(e) => setTelepon(e.target.value)}
                        placeholder="08..."
                        className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Email login</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="mt-1.5 w-full cursor-not-allowed rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-muted outline-none"
                    />
                  </div>

                  <div className="border-t border-line pt-6">
                    <label htmlFor="passwordBaru" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Kata sandi baru</label>
                    <input
                      id="passwordBaru"
                      type="password"
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Biarkan kosong jika tidak diubah"
                      className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                    />
                    <p className="mt-2 text-xs text-muted">Minimal 6 karakter.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? "Menyimpan..." : "Simpan perubahan"}
                  </button>
                </form>
              </div>
            )}

            {tabAktif === "keamanan" && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Keamanan</p>
                <h2 className="mt-2 font-serif text-2xl">Keamanan & privasi</h2>
                <p className="mt-1 text-sm text-muted">Status perlindungan akun dan sesi perangkat.</p>

                <div className="mt-6 flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-positive" />
                  <div>
                    <p className="text-sm font-medium">Akun dilindungi Supabase Auth</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Data transaksi dan foto struk disimpan dengan akses per pengguna melalui Row Level Security.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-line">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      <Monitor size={14} /> Sesi saat ini
                    </p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-positive">Aktif</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium">Browser web</p>
                    <p className="mt-0.5 text-xs text-muted">{email}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-line pt-6">
                  <p className="text-sm font-medium">Akhiri sesi</p>
                  <p className="mt-1 text-sm text-muted">Keluar dari perangkat ini dan kembali ke halaman masuk.</p>
                  <button
                    onClick={tanganiLogout}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-medium text-negative transition-colors hover:border-negative"
                  >
                    <LogOut size={16} /> Keluar sekarang
                  </button>
                </div>
              </div>
            )}

            {tabAktif === "cadangan" && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Ekspor</p>
                <h2 className="mt-2 font-serif text-2xl">Ekspor data</h2>
                <p className="mt-1 text-sm text-muted">Unduh catatan keuangan untuk arsip atau analisis di Excel.</p>

                <div className="mt-6 rounded-lg border border-line bg-surface p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-muted" />
                    <div>
                      <p className="text-sm font-medium">Laporan CSV</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Berisi jenis, kategori, jumlah, keterangan, tanggal, metode, dan rincian barang.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <select
                        value={filterBulanEkspor}
                        onChange={(e) => setFilterBulanEkspor(e.target.value)}
                        aria-label="Pilih periode ekspor"
                        className="w-full appearance-none rounded-md border border-line bg-paper py-2.5 pl-9 pr-8 font-mono text-xs text-ink outline-none focus:border-accent"
                      >
                        <option value="Semua Waktu">Semua waktu</option>
                        {daftarPeriodeTersedia.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                    </div>

                    <button
                      onClick={eksporKeCSV}
                      disabled={loadingEkspor}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {loadingEkspor ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {loadingEkspor ? "Memproses..." : "Unduh CSV"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tabAktif === "tampilan" && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tampilan</p>
                <h2 className="mt-2 font-serif text-2xl">Tema</h2>
                <p className="mt-1 text-sm text-muted">Pilih tampilan yang paling nyaman untuk mencatat.</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => ubahTema("terang")}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      tema === "terang" ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"
                    }`}
                  >
                    <Sun size={20} className={tema === "terang" ? "text-accent" : "text-muted"} />
                    <span>
                      <span className="block text-sm font-medium">Terang</span>
                      <span className="mt-0.5 block text-xs text-muted">Kertas putih, tinta gelap</span>
                    </span>
                  </button>

                  <button
                    onClick={() => ubahTema("gelap")}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      tema === "gelap" ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"
                    }`}
                  >
                    <Moon size={20} className={tema === "gelap" ? "text-accent" : "text-muted"} />
                    <span>
                      <span className="block text-sm font-medium">Gelap</span>
                      <span className="mt-0.5 block text-xs text-muted">Nyaman untuk malam</span>
                    </span>
                  </button>
                </div>

                <p className="mt-4 text-xs text-muted">Preferensi tema tersimpan di profil akun Anda.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
