"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// Batas tidak aktif sebelum sesi diakhiri (15 menit).
const WAKTU_TIMEOUT = 15 * 60 * 1000;
const INTERVAL_CEK = 30 * 1000;
const JEDA_SIMPAN = 5 * 1000;
const KUNCI_AKTIVITAS = 'aktivitas-terakhir';
const AKTIVITAS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
const RUTE_TANPA_AUTO_LOGOUT = ['/login', '/lupa-password', '/reset-password'];

// Timestamp disimpan di localStorage agar tetap terbaca setelah tab/aplikasi
// ditutup dan dibuka kembali, termasuk saat Android menghentikan proses tab.
function bacaAktivitas() {
    try {
        const nilai = Number(localStorage.getItem(KUNCI_AKTIVITAS));
        return Number.isFinite(nilai) && nilai > 0 ? nilai : 0;
    } catch {
        return 0;
    }
}

function simpanAktivitas(waktu: number) {
    try {
        localStorage.setItem(KUNCI_AKTIVITAS, String(waktu));
    } catch {
        // localStorage bisa diblokir; timer tetap berlaku selama tab terbuka.
    }
}

function hapusAktivitas() {
    try {
        localStorage.removeItem(KUNCI_AKTIVITAS);
    } catch {
        // Abaikan bila localStorage tidak tersedia.
    }
}

export default function AutoLogout() {
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const aktivitasTerakhir = useRef(0);
    const sedangLogout = useRef(false);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        const tersimpan = bacaAktivitas();
        aktivitasTerakhir.current = tersimpan > 0 ? tersimpan : Date.now();
        if (!tersimpan) simpanAktivitas(aktivitasTerakhir.current);

        let tulisTerakhir = 0;

        const catatAktivitas = () => {
            if (sedangLogout.current) return;
            const sekarang = Date.now();
            aktivitasTerakhir.current = sekarang;
            if (sekarang - tulisTerakhir >= JEDA_SIMPAN) {
                tulisTerakhir = sekarang;
                simpanAktivitas(sekarang);
            }
        };

        const cekIdle = async () => {
            if (sedangLogout.current) return;
            if (RUTE_TANPA_AUTO_LOGOUT.includes(pathnameRef.current)) return;

            const tersimpanTerbaru = bacaAktivitas();
            if (tersimpanTerbaru > aktivitasTerakhir.current) {
                aktivitasTerakhir.current = tersimpanTerbaru;
            }
            if (Date.now() - aktivitasTerakhir.current < WAKTU_TIMEOUT) return;

            sedangLogout.current = true;
            hapusAktivitas();
            try {
                await supabase.auth.signOut({ scope: 'local' });
            } catch {
                // Tetap arahkan ke login meskipun permintaan logout gagal.
            }
            alert("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali demi keamanan.");
            router.replace('/login');
        };

        const cekSaatTerlihat = () => {
            if (document.visibilityState === 'visible') {
                void cekIdle();
            } else {
                simpanAktivitas(aktivitasTerakhir.current);
            }
        };

        const simpanSaatKeluar = () => {
            simpanAktivitas(aktivitasTerakhir.current);
        };

        const sinkronTabLain = (event: StorageEvent) => {
            if (event.key !== KUNCI_AKTIVITAS) return;
            const nilai = Number(event.newValue);
            if (Number.isFinite(nilai) && nilai > aktivitasTerakhir.current) {
                aktivitasTerakhir.current = nilai;
            }
        };

        AKTIVITAS.forEach((event) => window.addEventListener(event, catatAktivitas, { passive: true }));
        window.addEventListener('focus', catatAktivitas);
        window.addEventListener('pageshow', cekSaatTerlihat);
        window.addEventListener('pagehide', simpanSaatKeluar);
        window.addEventListener('storage', sinkronTabLain);
        document.addEventListener('visibilitychange', cekSaatTerlihat);

        // Periksa segera saat mount: jika aplikasi dibuka kembali setelah
        // melewati batas idle, sesi langsung diakhiri tanpa menunggu interval.
        void cekIdle();

        const interval = setInterval(cekIdle, INTERVAL_CEK);

        return () => {
            AKTIVITAS.forEach((event) => window.removeEventListener(event, catatAktivitas));
            window.removeEventListener('focus', catatAktivitas);
            window.removeEventListener('pageshow', cekSaatTerlihat);
            window.removeEventListener('pagehide', simpanSaatKeluar);
            window.removeEventListener('storage', sinkronTabLain);
            document.removeEventListener('visibilitychange', cekSaatTerlihat);
            clearInterval(interval);
        };
    }, [router]);

    // Halaman auth tidak diawasi; mulai ulang hitungan idle saat pengguna
    // berada di sana agar login berikutnya tidak langsung dianggap kedaluwarsa.
    useEffect(() => {
        if (!RUTE_TANPA_AUTO_LOGOUT.includes(pathname)) return;
        sedangLogout.current = false;
        const sekarang = Date.now();
        aktivitasTerakhir.current = sekarang;
        simpanAktivitas(sekarang);
    }, [pathname]);

    return null;
}
