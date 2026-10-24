"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function AutoLogout() {
    const router = useRouter();
    const pathname = usePathname();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // WAKTU TIMEOUT: Atur berapa lama batas tidak aktifnya di sini
    // Saat ini diatur: 5 Menit (5 * 60 detik * 1000 milidetik)
    // Tips: Ubah angka 10 menjadi angka lain jika ingin mempercepat/memperlambat
    const WAKTU_TIMEOUT = 5*60*1000;

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            // Jangan jalankan aksi logout berulang jika pengguna memang sudah di halaman login
            if (pathname !== '/login') {
                await supabase.auth.signOut();
                alert("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali demi keamanan.");
                router.replace('/login');
            }
        }, WAKTU_TIMEOUT);
    };

    useEffect(() => {
        // Daftar aktivitas fisik yang akan me-reset timer (mencegah logout)
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        const tanganiAktivitas = () => {
            resetTimer();
        };

        // Pasang alat pendeteksi aktivitas ke seluruh halaman web
        events.forEach(event => window.addEventListener(event, tanganiAktivitas));

        // Mulai hitung mundur pertama kali saat aplikasi dibuka
        resetTimer();

        // Matikan pendeteksi saat aplikasi ditutup agar tidak membebani memori HP/Laptop
        return () => {
            events.forEach(event => window.removeEventListener(event, tanganiAktivitas));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    // Komponen ini tidak memiliki tampilan (menghilang di layar)
    return null;
}