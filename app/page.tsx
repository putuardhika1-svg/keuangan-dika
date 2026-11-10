"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { formatRupiah, getBulanTahun, getInisial, getNamaTampilan, pecahTanggal, pesanError, terapkanTema, toNumber } from '@/utils/format';
import type { Anggaran, PesanChat, Transaksi } from '@/utils/types';
import { KATEGORI } from '@/utils/kategori';
import { Bar, BarChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Calendar, CalendarDays, ChevronDown, CreditCard, Edit2, Home as HomeIcon, Image as ImageIcon, Loader2, LogOut, Moon, Plus, PlusCircle, Receipt, Save, Send, Settings, Sun, Trash2, X } from 'lucide-react';

const KUNCI_ANGGARAN_LAMA = 'budgetKeuanganArdhika';
const KUNCI_ANGGARAN = 'budgetKeuanganArdhika:';
const SEMUA_PERIODE = 'Semua periode';
const KATEGORI_ANGGARAN = Array.from(new Set(Object.values(KATEGORI).flat()));
const ANGGARAN_DEFAULT: Anggaran[] = [
  { kategori: "Makanan", batas: 1500000 },
  { kategori: "Transportasi", batas: 500000 },
];

export default function Home() {
  const router = useRouter();

  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [transaksiTerpilih, setTransaksiTerpilih] = useState<Transaksi | null>(null);
  const [urlBukti, setUrlBukti] = useState<string | null>(null);
  const [urlBuktiError, setUrlBuktiError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [memuatData, setMemuatData] = useState(true);
  const [errorData, setErrorData] = useState("");

  // STATE FILTER
  const [filterAktif, setFilterAktif] = useState("Semua");
  const [periodeAktif, setPeriodeAktif] = useState(""); 

  // STATE ANGGARAN (BUDGETING) & EDIT MODE
  const [targetAnggaran, setTargetAnggaran] = useState(ANGGARAN_DEFAULT);
  const [isEditingAnggaran, setIsEditingAnggaran] = useState(false);
  const [menyimpanAnggaran, setMenyimpanAnggaran] = useState(false);

  // STATE UNTUK FITUR TANYA JAWAB / SIMULASI BELI
  const [pertanyaanUser, setPertanyaanUser] = useState("");
  const [riwayatChat, setRiwayatChat] = useState<PesanChat[]>([
    { sender: "bot", teks: "Halo! Ada rencana pengeluaran besar atau hal yang ingin didiskusikan terkait keuangan bulan ini? Ketik pertanyaannya di bawah ya." }
  ]);

  const [sapaan, setSapaan] = useState("Halo");
  const [namaTampilan, setNamaTampilan] = useState("Ardhika");
  const [userEmail, setUserEmail] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const bacaAnggaranLokal = (idUser: string): Anggaran[] | null => {
    try {
      const kunci = `${KUNCI_ANGGARAN}${idUser}`;
      const mentah = localStorage.getItem(kunci) ?? localStorage.getItem(KUNCI_ANGGARAN_LAMA);
      if (!mentah) return null;

      const hasil: unknown = JSON.parse(mentah);
      if (!Array.isArray(hasil)) return null;

      return hasil
        .map((item: unknown) => {
          const data = (item ?? {}) as { kategori?: unknown; batas?: unknown };
          return {
            kategori: data.kategori === "Makan" ? "Makanan" : String(data.kategori ?? "").trim(),
            batas: Math.max(toNumber(data.batas), 0),
          };
        })
        .filter((item) => item.kategori.length > 0);
    } catch {
      return null;
    }
  };

  const simpanAnggaranLokal = (idUser: string, data: Anggaran[]) => {
    try {
      localStorage.setItem(`${KUNCI_ANGGARAN}${idUser}`, JSON.stringify(data));
      localStorage.removeItem(KUNCI_ANGGARAN_LAMA);
    } catch {
      // Cache lokal opsional; database tetap sumber utama.
    }
  };

  const muatAnggaran = async (idUser: string) => {
    const lokal = bacaAnggaranLokal(idUser);

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('kategori, batas')
        .eq('user_id', idUser)
        .order('kategori');

      if (error) throw error;

      if (data && data.length > 0) {
        const dariDatabase: Anggaran[] = data.map((item) => ({
          kategori: String(item.kategori ?? '').trim(),
          batas: Math.max(toNumber(item.batas), 0),
        })).filter((item) => item.kategori.length > 0);

        setTargetAnggaran(dariDatabase);
        simpanAnggaranLokal(idUser, dariDatabase);
        return;
      }
    } catch (error) {
      console.warn("Tabel budgets belum siap, memakai cache lokal.", error);
    }

    if (lokal) setTargetAnggaran(lokal);
  };

  const fetchData = async (idUser?: string) => {
    setMemuatData(true);
    setErrorData("");

    try {
      let query = supabase
        .from('transaksi')
        .select('id, user_id, jenis, kategori, jumlah, keterangan, tanggal, metode_pembayaran, detail_barang')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false });

      if (idUser) query = query.eq('user_id', idUser);

      const { data, error } = await query;
      if (error) throw error;
      setTransaksi((data ?? []) as Transaksi[]);
    } catch (error) {
      console.error("Gagal memuat transaksi:", error);
      setErrorData(pesanError(error, "Gagal memuat transaksi. Coba muat ulang halaman ini."));
    } finally {
      setMemuatData(false);
    }
  };

  useEffect(() => {
    const bulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- periode awal mengikuti bulan berjalan
    setPeriodeAktif(bulanIni);

    const cekLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const user = session.user;
      setUserId(user.id);
      setNamaTampilan(getNamaTampilan(user.email, user.user_metadata?.nama));
      if (user.email) setUserEmail(user.email);

      const temaTersimpan = user.user_metadata?.tema ?? localStorage.getItem('tema');
      const gelap = temaTersimpan === 'gelap';
      setIsDarkMode(gelap);
      terapkanTema(gelap ? 'gelap' : 'terang');

      muatAnggaran(user.id);
      fetchData(user.id);
    };

    cekLogin();

    const jam = new Date().getHours();
    if (jam >= 4 && jam < 11) setSapaan("Selamat Pagi");
    else if (jam >= 11 && jam < 15) setSapaan("Selamat Siang");
    else if (jam >= 15 && jam < 19) setSapaan("Selamat Sore");
    else setSapaan("Selamat Malam");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muatAnggaran/fetchData hanya dipakai saat mount
  }, [router]);

  const tanganiLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const gantiTema = async () => {
    const gelap = !isDarkMode;
    setIsDarkMode(gelap);
    terapkanTema(gelap ? 'gelap' : 'terang');
    try {
      await supabase.auth.updateUser({ data: { tema: gelap ? 'gelap' : 'terang' } });
    } catch (error) {
      console.warn("Preferensi tema gagal disimpan ke profil:", error);
    }
  };

  const tutupDetail = () => {
    setTransaksiTerpilih(null);
    setUrlBukti(null);
    setUrlBuktiError(null);
  };

  const bukaDetail = async (transaksi: Transaksi) => {
    setTransaksiTerpilih(transaksi);
    setUrlBukti(null);
    setUrlBuktiError(null);

    try {
      const { data, error } = await supabase
        .from('transaksi')
        .select('bukti_foto')
        .eq('id', transaksi.id)
        .maybeSingle();
      if (error) throw error;

      const bukti = data?.bukti_foto;
      setTransaksiTerpilih({ ...transaksi, bukti_foto: bukti ?? null });

      if (!bukti) return;

      if (/^(https?:|data:|blob:)/.test(bukti)) {
        setUrlBukti(bukti);
        return;
      }

      const { data: signed, error: errorSigned } = await supabase.storage
        .from('bukti-struk')
        .createSignedUrl(bukti, 3600);
      if (errorSigned) throw errorSigned;
      if (!signed?.signedUrl) throw new Error("Foto struk tidak ditemukan di penyimpanan.");
      setUrlBukti(signed.signedUrl);
    } catch (error) {
      console.warn("Gagal membuka foto struk:", error);
      setUrlBuktiError(pesanError(error, "Gagal memuat foto struk."));
    }
  };

  useEffect(() => {
    if (!transaksiTerpilih) return;
    const tanganiEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTransaksiTerpilih(null);
        setUrlBukti(null);
        setUrlBuktiError(null);
      }
    };
    window.addEventListener('keydown', tanganiEscape);
    return () => window.removeEventListener('keydown', tanganiEscape);
  }, [transaksiTerpilih]);

  const hapusTransaksi = async (id: string) => {
    const konfirmasi = window.confirm("Yakin ingin menghapus transaksi ini?");
    if (!konfirmasi) return;

    try {
      let query = supabase.from('transaksi').delete().eq('id', id);
      if (userId) query = query.eq('user_id', userId);

      const { error } = await query;
      if (error) throw error;

      const bukti = transaksiTerpilih?.bukti_foto;
      if (bukti && !/^(https?:|data:|blob:)/.test(bukti)) {
        const { error: errorFoto } = await supabase.storage.from('bukti-struk').remove([bukti]);
        if (errorFoto) console.warn("Gagal menghapus foto struk:", errorFoto.message);
      }

      tutupDetail();
      fetchData(userId);
    } catch (error) {
      alert("Gagal menghapus data: " + pesanError(error));
    }
  };

  // --- FUNGSI MANAJEMEN ANGGARAN ---
  const simpanPerubahanAnggaran = async () => {
    const bersih = targetAnggaran
      .map((item) => ({
        kategori: item.kategori.trim(),
        batas: Math.max(toNumber(item.batas), 0),
      }))
      .filter((item) => item.kategori.length > 0);

    const duplikat = bersih.filter(
      (item, index) => bersih.findIndex((lain) => lain.kategori === item.kategori) !== index,
    );
    if (duplikat.length > 0) {
      alert(`Kategori anggaran tidak boleh duplikat: ${duplikat.map((item) => item.kategori).join(', ')}.`);
      return;
    }

    if (!userId) {
      setTargetAnggaran(bersih);
      setIsEditingAnggaran(false);
      return;
    }

    setMenyimpanAnggaran(true);

    try {
      if (bersih.length > 0) {
        const { error } = await supabase.from('budgets').upsert(
          bersih.map((item) => ({ user_id: userId, ...item })),
          { onConflict: 'user_id,kategori' }
        );
        if (error) throw error;
      }

      const { data: tersimpan, error: errorAmbil } = await supabase
        .from('budgets')
        .select('kategori')
        .eq('user_id', userId);
      if (errorAmbil) throw errorAmbil;

      const kategoriBaru = new Set(bersih.map((item) => item.kategori));
      const usang = (tersimpan ?? [])
        .map((item) => String(item.kategori ?? ''))
        .filter((kategori) => kategori.length > 0 && !kategoriBaru.has(kategori));

      if (usang.length > 0) {
        const { error: errorHapus } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', userId)
          .in('kategori', usang);
        if (errorHapus) throw errorHapus;
      }
    } catch (error) {
      console.warn("Anggaran tersimpan lokal; sinkronisasi database gagal.", error);
      alert(
        "Anggaran tersimpan di perangkat, tetapi gagal disinkronkan ke database.\n\n" +
        pesanError(error, "Pastikan migration Supabase sudah dijalankan."),
      );
    } finally {
      simpanAnggaranLokal(userId, bersih);
      setTargetAnggaran(bersih);
      setIsEditingAnggaran(false);
      setMenyimpanAnggaran(false);
    }
  };

  const ubahDataAnggaran = (index: number, field: string, value: string | number) => {
    const dataBaru = [...targetAnggaran];
    dataBaru[index] = { ...dataBaru[index], [field]: value };
    setTargetAnggaran(dataBaru);
  };

  const tambahKategoriAnggaran = () => {
    setTargetAnggaran([...targetAnggaran, { kategori: "", batas: 0 }]);
  };

  const hapusKategoriAnggaran = (index: number) => {
    const dataBaru = targetAnggaran.filter((_, i) => i !== index);
    setTargetAnggaran(dataBaru);
  };

  // --- FUNGSI RESET RIWAYAT CHAT ---
  const resetChat = () => {
    setRiwayatChat([
      { sender: "bot", teks: `Halo ${namaTampilan}! Riwayat percakapan telah dibersihkan. Ada rencana pengeluaran atau hal lain yang ingin didiskusikan?` }
    ]);
  };

  const setPeriodeUnik = new Set(transaksi.map(t => getBulanTahun(t.tanggal)));
  if (periodeAktif && periodeAktif !== SEMUA_PERIODE) {
    setPeriodeUnik.add(periodeAktif);
  }
  const daftarPeriodeTersedia = Array.from(setPeriodeUnik)
    .filter((periode) => periode !== "Lainnya" && periode !== SEMUA_PERIODE);

  // --- PERHITUNGAN TOTAL SALDO & FILTER ---
  const totalPemasukanSemua = transaksi.filter(t => t.jenis === 'Pemasukan').reduce((a, b) => a + toNumber(b.jumlah), 0);
  const totalPengeluaranSemua = transaksi.filter(t => t.jenis === 'Pengeluaran').reduce((a, b) => a + toNumber(b.jumlah), 0);
  const totalHutangSemua = transaksi.filter(t => t.jenis === 'Hutang').reduce((a, b) => a + toNumber(b.jumlah), 0);
  const totalPiutangSemua = transaksi.filter(t => t.jenis === 'Piutang').reduce((a, b) => a + toNumber(b.jumlah), 0);
  const saldoKasUtama = (totalPemasukanSemua + totalHutangSemua) - (totalPengeluaranSemua + totalPiutangSemua);

  const transaksiPeriode = periodeAktif === SEMUA_PERIODE
    ? transaksi
    : transaksi.filter(t => getBulanTahun(t.tanggal) === periodeAktif);

  const totalPemasukan = transaksiPeriode.filter(t => t.jenis === 'Pemasukan').reduce((a, b) => a + toNumber(b.jumlah), 0);
  const totalPengeluaran = transaksiPeriode.filter(t => t.jenis === 'Pengeluaran').reduce((a, b) => a + toNumber(b.jumlah), 0);

  const dataPengeluaran = transaksiPeriode.filter(t => t.jenis === 'Pengeluaran');
  const kategoriGrup = dataPengeluaran.reduce<Record<string, number>>((acc, curr) => {
    const kategori = curr.kategori || 'Lainnya';
    acc[kategori] = (acc[kategori] || 0) + toNumber(curr.jumlah);
    return acc;
  }, {});

  const dataGrafik = Object.keys(kategoriGrup).map(kategori => ({
    name: kategori,
    value: kategoriGrup[kategori]
  }));

  // Anggaran dan rekomendasi selalu mengacu ke bulan berjalan,
  // meskipun pengguna sedang melihat "Semua periode".
  const periodeBulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const transaksiBulanIni = transaksi.filter(t => getBulanTahun(t.tanggal) === periodeBulanIni);
  const totalPemasukanBulanIni = transaksiBulanIni
    .filter(t => t.jenis === 'Pemasukan')
    .reduce((a, b) => a + toNumber(b.jumlah), 0);
  const totalPengeluaranBulanIni = transaksiBulanIni
    .filter(t => t.jenis === 'Pengeluaran')
    .reduce((a, b) => a + toNumber(b.jumlah), 0);
  const kategoriGrupBulanIni = transaksiBulanIni
    .filter(t => t.jenis === 'Pengeluaran')
    .reduce<Record<string, number>>((acc, curr) => {
      const kategori = curr.kategori || 'Lainnya';
      acc[kategori] = (acc[kategori] || 0) + toNumber(curr.jumlah);
      return acc;
    }, {});

  // --- LOGIKA REKOMENDASI BULANAN ---
  const dapatkanRekomendasiKeuangan = () => {
    if (transaksiBulanIni.length === 0) {
      return {
        tipe: "info",
        pesan: "Belum ada transaksi tercatat di bulan ini. Mulai catat pemasukan atau pengeluaran pertamamu!"
      };
    }

    for (const anggaran of targetAnggaran) {
      const terpakai = kategoriGrupBulanIni[anggaran.kategori] || 0;
      if (terpakai > anggaran.batas) {
        return {
          tipe: "bahaya",
          pesan: `Peringatan! Anggaran kategori "${anggaran.kategori}" sudah jebol (overbudget). Coba kendalikan pengeluaran di sektor ini minggu depan.`
        };
      } else if (terpakai >= anggaran.batas * 0.8) {
        return {
          tipe: "peringatan",
          pesan: `Hati-hati, pengeluaran "${anggaran.kategori}" sudah mencapai lebih dari 80% batas anggaran bulan ini.`
        };
      }
    }

    if (totalPemasukanBulanIni > 0) {
      const sisaBulanIni = totalPemasukanBulanIni - totalPengeluaranBulanIni;
      const rasioTabungan = (sisaBulanIni / totalPemasukanBulanIni) * 100;

      if (rasioTabungan >= 30) {
        return {
          tipe: "sukses",
          pesan: `Hebat, ${namaTampilan}! Bulan ini kamu berhasil mengamankan sekitar ${rasioTabungan.toFixed(0)}% dari total pemasukanmu. Pertahankan manajemen kas yang sehat ini!`
        };
      } else if (sisaBulanIni < 0) {
        return {
          tipe: "bahaya",
          pesan: "Arus kas bulan ini negatif (pengeluaran melebihi pemasukan). Periksa kembali riwayat transaksi untuk meninjau pos pengeluaran terbesar."
        };
      }
    }

    return {
      tipe: "normal",
      pesan: "Keuangan bulan ini terpantau stabil dan terkendali. Lanjutkan pencatatan rutin setiap hari!"
    };
  };

  const rekomendasi = dapatkanRekomendasiKeuangan();
  const arusKasBersih = totalPemasukan - totalPengeluaran;
  const nadaRekomendasi = rekomendasi.tipe === 'bahaya'
    ? 'border-negative'
    : rekomendasi.tipe === 'peringatan'
      ? 'border-warning'
      : rekomendasi.tipe === 'sukses'
        ? 'border-positive'
        : 'border-line';

  // --- LOGIKA ANALISIS TANYA JAWAB (SIMULASI PEMBELIAN / RENCANA) ---
  const kirimPertanyaan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pertanyaanUser.trim()) return;

    const teksInput = pertanyaanUser.toLowerCase();
    const chatBaru: PesanChat[] = [...riwayatChat, { sender: "user", teks: pertanyaanUser }];
    setRiwayatChat(chatBaru);
    setPertanyaanUser("");

    setTimeout(() => {
      let jawabanBot = "";

      if (teksInput.includes("motor") || teksInput.includes("beli") || teksInput.includes("harga") || teksInput.includes("cicil")) {
        const angkaDitemukan = teksInput.match(/(\d+)/);
        
        if (teksInput.includes("20 juta") || teksInput.includes("20.000.000") || (angkaDitemukan && parseInt(angkaDitemukan[0]) >= 1000000)) {
          jawabanBot = `Analisis Keuangan untuk Rencana Ini:\n- Total Kas Tersedia Anda saat ini: ${formatRupiah(saldoKasUtama)}.\n- Jika digunakan untuk pembelian besar secara tunai, kas Anda akan sangat menipis.\nSaran: Sebaiknya gunakan sistem cicilan terencana dengan alokasi maksimal 20% dari pemasukan bulanan agar anggaran rutin tetap aman.`;
        } else {
          jawabanBot = `Berdasarkan total kas tersedia saat ini (${formatRupiah(saldoKasUtama)}), pastikan pembelian tersebut tidak melebihi sisa tabungan bulanan Anda. Cek kembali apakah pos anggaran utama seperti makan dan transportasi sudah aman sebelum memutuskan membeli.`;
        }
      } else if (teksInput.includes("liburan") || teksInput.includes("jalan-jalan")) {
        jawabanBot = `Untuk rencana liburan, pastikan Anda menggunakan sisa anggaran bulanan yang tidak terpakai. Jangan mengambil dana dari alokasi tabungan darurat atau pos wajib!`;
      } else {
        jawabanBot = `Halo ${namaTampilan}! Berdasarkan data bulan ini, total pengeluaran Anda adalah ${formatRupiah(totalPengeluaranBulanIni)} dari pemasukan ${formatRupiah(totalPemasukanBulanIni)}. Pastikan setiap rencana pengeluaran besar telah memperhitungkan sisa kas saat ini.`;
      }

      setRiwayatChat(prev => [...prev, { sender: "bot", teks: jawabanBot }]);
    }, 600);
  };

  const transaksiDifilter = transaksiPeriode.filter(t => {
    if (filterAktif === "Semua") return true;
    return t.jenis === filterAktif;
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface px-5 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-serif text-lg text-paper">B</span>
          <span>
            <span className="block font-serif text-lg leading-none">Buku Kas</span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Keuangan pribadi</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1" aria-label="Navigasi utama">
          <Link href="/" aria-current="page" className="flex items-center gap-3 rounded-md bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent">
            <HomeIcon size={17} /> Ringkasan
          </Link>
          <Link href="/tambah" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink">
            <Plus size={17} /> Catat transaksi
          </Link>
          <Link href="/pengaturan" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink">
            <Settings size={17} /> Pengaturan
          </Link>
        </nav>

        <div className="mt-8 border-t border-line pt-5">
          <label htmlFor="periode-sidebar" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Periode</label>
          <div className="relative mt-2">
            <CalendarDays size={15} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
            <select
              id="periode-sidebar"
              value={periodeAktif}
              onChange={(e) => setPeriodeAktif(e.target.value)}
              className="w-full appearance-none bg-transparent py-1 pl-6 pr-5 font-mono text-sm text-ink outline-none"
            >
              <option value={SEMUA_PERIODE} className="bg-surface text-ink">{SEMUA_PERIODE}</option>
              {daftarPeriodeTersedia.map((p) => (
                <option key={p} value={p} className="bg-surface text-ink">{p}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="mt-auto space-y-4 border-t border-line pt-5">
          <button onClick={gantiTema} className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm text-muted transition-colors hover:text-ink">
            <span className="flex items-center gap-3">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              {isDarkMode ? "Mode terang" : "Mode gelap"}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-mono text-xs font-medium text-ink">
              {getInisial(namaTampilan)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{namaTampilan}</p>
              <p className="truncate text-xs text-muted">{userEmail}</p>
            </div>
            <button onClick={tanganiLogout} aria-label="Keluar" className="rounded-md p-2 text-muted transition-colors hover:bg-paper hover:text-negative">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper px-5 py-3 lg:hidden">
        <Link href="/" className="font-serif text-lg">Buku Kas</Link>
        <div className="flex items-center gap-1">
          <button onClick={gantiTema} aria-label="Ganti tema" className="rounded-md p-2 text-muted hover:bg-surface hover:text-ink">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/pengaturan" aria-label="Pengaturan" className="rounded-md p-2 text-muted hover:bg-surface hover:text-ink">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      <div className="lg:pl-60">
        <main className="mx-auto max-w-5xl px-5 pb-28 pt-8 lg:px-10 lg:pb-16 lg:pt-12">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{sapaan}</p>
              <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">Ringkasan</h1>
            </div>
            <div className="relative lg:hidden">
              <select
                value={periodeAktif}
                onChange={(e) => setPeriodeAktif(e.target.value)}
                aria-label="Pilih periode"
                className="appearance-none rounded-md border border-line bg-surface py-2 pl-3 pr-9 font-mono text-xs text-ink outline-none"
              >
                <option value={SEMUA_PERIODE}>{SEMUA_PERIODE}</option>
                {daftarPeriodeTersedia.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </header>

          {errorData && (
            <div className="mt-6 border-l-2 border-negative pl-3 text-sm text-negative" role="alert">
              {errorData}
            </div>
          )}

          <section className="mt-8 border-y border-line py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Saldo kas · akumulasi</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <p className="angka break-words font-serif text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">{formatRupiah(saldoKasUtama)}</p>
              <p suppressHydrationWarning className="font-mono text-[11px] text-muted">
                per {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-4">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Pemasukan</dt>
                <dd className="angka mt-1 font-mono text-sm text-positive">+{formatRupiah(totalPemasukan)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Pengeluaran</dt>
                <dd className="angka mt-1 font-mono text-sm text-negative">−{formatRupiah(totalPengeluaran)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Arus kas</dt>
                <dd className={`angka mt-1 font-mono text-sm ${arusKasBersih < 0 ? "text-negative" : "text-ink"}`}>
                  {arusKasBersih < 0 ? "−" : "+"}{formatRupiah(Math.abs(arusKasBersih))}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Catatan</dt>
                <dd className="angka mt-1 font-mono text-sm text-ink">
                  {memuatData ? "Memuat..." : `${transaksiPeriode.length} transaksi`}
                </dd>
              </div>
            </dl>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
            <div className="space-y-8">
              <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl">Komposisi pengeluaran</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{periodeAktif}</span>
                </div>

                {memuatData ? (
                  <p className="mt-8 border-t border-line pt-8 text-sm text-muted">Memuat data...</p>
                ) : dataGrafik.length === 0 ? (
                  <p className="mt-8 border-t border-line pt-8 text-sm text-muted">Belum ada pengeluaran pada periode ini.</p>
                ) : (
                  <div className="mt-6 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGrafik} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={96}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--muted)", fontSize: 12 }}
                        />
                        <ChartTooltip
                          cursor={{ fill: "var(--accent-soft)" }}
                          formatter={(value: unknown) => formatRupiah(Number(value))}
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--ink)",
                          }}
                        />
                        <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-line bg-surface">
                <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                  <div>
                    <h2 className="font-serif text-xl">Transaksi</h2>
                    <p className="mt-1 text-xs text-muted">{transaksiDifilter.length} catatan · {periodeAktif}</p>
                  </div>
                  <div className="hide-scrollbar flex gap-5 overflow-x-auto">
                    {["Semua", "Pengeluaran", "Pemasukan", "Hutang", "Piutang"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFilterAktif(filter)}
                        className={`shrink-0 border-b-2 pb-1.5 text-xs font-medium transition-colors ${
                          filterAktif === filter
                            ? "border-ink text-ink"
                            : "border-transparent text-muted hover:text-ink"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {memuatData ? (
                  <div className="px-5 py-14 text-center text-sm text-muted sm:px-6">Memuat transaksi...</div>
                ) : transaksiDifilter.length === 0 ? (
                  <div className="px-5 py-14 text-center sm:px-6">
                    <p className="text-sm text-muted">Belum ada catatan pada periode ini.</p>
                    <Link href="/tambah" className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90">
                      <Plus size={15} /> Catat transaksi
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {transaksiDifilter.map((t) => {
                      const tanggal = pecahTanggal(t.tanggal);
                      const masuk = t.jenis === "Pemasukan" || t.jenis === "Hutang";
                      return (
                        <button
                          key={t.id}
                          onClick={() => bukaDetail(t)}
                          className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-paper sm:px-6"
                        >
                          <span className="text-center">
                            <span className="angka block font-mono text-base leading-none">{tanggal.hari}</span>
                            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{tanggal.bulan}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {t.keterangan && t.keterangan !== "-" ? t.keterangan : t.kategori}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted">{t.kategori} · {t.metode_pembayaran || "Tunai"}</span>
                          </span>
                          <span className={`angka whitespace-nowrap font-mono text-sm ${masuk ? "text-positive" : "text-ink"}`}>
                            {masuk ? "+" : "−"}{formatRupiah(toNumber(t.jumlah))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-8">
              <section className={`border-l-2 pl-4 ${nadaRekomendasi}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Catatan bulan ini</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{rekomendasi.pesan}</p>
              </section>

              <section className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl">Anggaran</h2>
                  <button
                    onClick={() => (isEditingAnggaran ? simpanPerubahanAnggaran() : setIsEditingAnggaran(true))}
                    disabled={menyimpanAnggaran}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-60"
                  >
                    {menyimpanAnggaran ? (
                      <><Loader2 size={14} className="animate-spin" /> Menyimpan</>
                    ) : isEditingAnggaran ? (
                      <><Save size={14} /> Simpan</>
                    ) : (
                      <><Edit2 size={14} /> Ubah</>
                    )}
                  </button>
                </div>

                {isEditingAnggaran ? (
                  <div className="mt-5 space-y-3">
                    {targetAnggaran.map((anggaran, index) => (
                      <div key={index} className="grid grid-cols-[1fr_92px_28px] items-end gap-2">
                        <div>
                          <label htmlFor={`anggaran-kategori-${index}`} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Kategori</label>
                          <select
                            id={`anggaran-kategori-${index}`}
                            value={anggaran.kategori}
                            onChange={(e) => ubahDataAnggaran(index, "kategori", e.target.value)}
                            className="mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm outline-none focus:border-accent"
                          >
                            <option value="" disabled>Pilih kategori</option>
                            {Array.from(new Set([...KATEGORI_ANGGARAN, anggaran.kategori].filter(Boolean))).map((kategori) => (
                              <option key={kategori} value={kategori}>{kategori}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Batas (Rp)</label>
                          <input
                            type="number"
                            value={anggaran.batas}
                            onChange={(e) => ubahDataAnggaran(index, "batas", Number(e.target.value))}
                            className="angka mt-1 w-full rounded-md border border-line bg-paper px-2.5 py-2 font-mono text-sm outline-none focus:border-accent"
                          />
                        </div>
                        <button
                          onClick={() => hapusKategoriAnggaran(index)}
                          aria-label={`Hapus anggaran ${anggaran.kategori || index + 1}`}
                          className="flex h-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper hover:text-negative"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={tambahKategoriAnggaran}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line py-2.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <PlusCircle size={15} /> Tambah kategori
                    </button>
                  </div>
                ) : targetAnggaran.length === 0 ? (
                  <p className="mt-5 text-sm text-muted">Belum ada anggaran. Klik “Ubah” untuk menambahkan.</p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {targetAnggaran.map((anggaran) => {
                      const terpakai = kategoriGrupBulanIni[anggaran.kategori] || 0;
                      const sisa = Math.max(anggaran.batas - terpakai, 0);
                      const lewat = terpakai > anggaran.batas;
                      const persentase = anggaran.batas > 0
                        ? (lewat ? 100 : Math.min((terpakai / anggaran.batas) * 100, 100))
                        : (terpakai > 0 ? 100 : 0);
                      const warna = lewat || persentase >= 90
                        ? "bg-negative"
                        : persentase >= 70
                          ? "bg-warning"
                          : "bg-accent";

                      return (
                        <div key={anggaran.kategori}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm font-medium">{anggaran.kategori}</p>
                            <p className={`angka shrink-0 font-mono text-xs ${lewat ? "text-negative" : "text-muted"}`}>
                              {lewat ? "Lewat batas" : formatRupiah(sisa)}
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                            <div className={`h-full rounded-full transition-all duration-500 ${warna}`} style={{ width: `${persentase}%` }} />
                          </div>
                          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                            <span>{formatRupiah(terpakai)} terpakai</span>
                            <span>{formatRupiah(anggaran.batas)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <details className="group rounded-xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Simulasi sederhana</p>
                    <p className="mt-1 text-sm font-medium">Uji rencana pengeluaran</p>
                    <p className="mt-0.5 text-xs text-muted">Berbasis aturan, bukan analisis AI.</p>
                  </div>
                  <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
                </summary>

                <div className="border-t border-line p-5">
                  <div className="space-y-3">
                    {riwayatChat.slice(-4).map((chat, idx) => (
                      <div key={idx}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                          {chat.sender === "user" ? "Pertanyaan" : "Ringkasan"}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{chat.teks}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={kirimPertanyaan} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={pertanyaanUser}
                      onChange={(e) => setPertanyaanUser(e.target.value)}
                      placeholder="Contoh: beli motor 15 juta"
                      className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <button type="submit" aria-label="Kirim simulasi" className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-paper transition-opacity hover:opacity-90">
                      <Send size={15} />
                    </button>
                  </form>
                  <button onClick={resetChat} className="mt-2 text-[11px] text-muted transition-colors hover:text-negative">
                    Bersihkan riwayat
                  </button>
                </div>
              </details>
            </div>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden" aria-label="Navigasi bawah">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <Link href="/" className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-accent">
            <HomeIcon size={18} /> Ringkasan
          </Link>
          <Link href="/tambah" className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
              <Plus size={16} />
            </span>
            Catat
          </Link>
          <Link href="/pengaturan" className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted">
            <Settings size={18} /> Pengaturan
          </Link>
        </div>
      </nav>

      {transaksiTerpilih && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={tutupDetail}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-transaksi-title"
            className="animate-in flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 id="detail-transaksi-title" className="font-serif text-xl">Detail transaksi</h2>
              <div className="flex items-center gap-1">
                <Link href={`/edit/${transaksiTerpilih.id}`} aria-label="Edit transaksi" className="rounded-md p-2 text-muted transition-colors hover:bg-paper hover:text-accent">
                  <Edit2 size={18} />
                </Link>
                <button onClick={() => hapusTransaksi(transaksiTerpilih.id)} aria-label="Hapus transaksi" className="rounded-md p-2 text-muted transition-colors hover:bg-paper hover:text-negative">
                  <Trash2 size={18} />
                </button>
                <button onClick={tutupDetail} aria-label="Tutup detail" className="rounded-md p-2 text-muted transition-colors hover:bg-paper hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {transaksiTerpilih.jenis} · {transaksiTerpilih.kategori}
                </p>
                <p className={`angka mt-2 whitespace-nowrap font-serif text-4xl ${transaksiTerpilih.jenis === "Pemasukan" || transaksiTerpilih.jenis === "Hutang" ? "text-positive" : "text-ink"}`}>
                  {formatRupiah(toNumber(transaksiTerpilih.jumlah))}
                </p>
                <p className="mt-1 text-sm text-muted">{transaksiTerpilih.keterangan || "-"}</p>
              </div>

              <dl className="divide-y divide-line border-y border-line">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-xs text-muted"><Calendar size={14} /> Tanggal</dt>
                  <dd className="font-mono text-xs text-ink">{transaksiTerpilih.tanggal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-xs text-muted"><CreditCard size={14} /> Metode</dt>
                  <dd className="font-mono text-xs text-ink">{transaksiTerpilih.metode_pembayaran || "Tidak diketahui"}</dd>
                </div>
              </dl>

              {transaksiTerpilih.detail_barang && (
                <div>
                  <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    <Receipt size={14} /> Rincian
                  </h3>
                  {(() => {
                    const detail = transaksiTerpilih.detail_barang;
                    if (detail === "-") return <p className="mt-3 text-sm text-muted">Tidak ada rincian tercatat.</p>;
                    try {
                      const parsed = JSON.parse(detail);
                      if (Array.isArray(parsed)) {
                        return (
                          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                            {parsed.map((item: unknown, idx: number) => {
                              const data = (item ?? {}) as { nama?: unknown; qty?: unknown; harga?: unknown };
                              const qty = toNumber(data.qty);
                              const harga = toNumber(data.harga);
                              return (
                                <li key={idx} className="flex items-start justify-between gap-4 px-3 py-2.5">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm">{String(data.nama ?? "")}</span>
                                    <span className="mt-0.5 block font-mono text-[10px] text-muted">{qty} × {formatRupiah(harga)}</span>
                                  </span>
                                  <span className="angka shrink-0 font-mono text-sm">{formatRupiah(qty * harga)}</span>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }
                    } catch {
                      return <p className="mt-3 whitespace-pre-line rounded-lg border border-line bg-paper p-3 text-sm text-ink">{detail}</p>;
                    }
                  })()}
                </div>
              )}

              {transaksiTerpilih.bukti_foto && (
                <div>
                  <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    <ImageIcon size={14} /> Foto struk
                  </h3>
                  {urlBukti ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL dari Supabase Storage
                    <img src={urlBukti} alt="Bukti struk" loading="lazy" className="mt-3 w-full rounded-lg border border-line" />
                  ) : urlBuktiError ? (
                    <div className="mt-3 border-l-2 border-negative pl-3">
                      <p className="text-sm text-negative">{urlBuktiError}</p>
                      <button
                        type="button"
                        onClick={() => bukaDetail(transaksiTerpilih)}
                        className="mt-2 text-xs font-medium text-accent hover:underline"
                      >
                        Coba lagi
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Memuat foto...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
