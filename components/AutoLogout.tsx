"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// Batas tidak aktif sebelum sesi diakhiri (15 menit).
const WAKTU_TIMEOUT = 15 * 60 * 1000;
const INTERVAL_CEK = 30 * 1000;
const AKTIVITAS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export default function AutoLogout() {
    const router = useRouter();
    const pathname = usePathname();
    const aktivitasTerakhir = useRef(0);
    const sedangLogout = useRef(false);

    useEffect(() => {
        aktivitasTerakhir.current = Date.now();
        if (pathname === '/login') sedangLogout.current = false;

        const catatAktivitas = () => {
            aktivitasTerakhir.current = Date.now();
        };

        AKTIVITAS.forEach((event) => window.addEventListener(event, catatAktivitas, { passive: true }));

        const cekIdle = async () => {
            if (sedangLogout.current) return;
            if (Date.now() - aktivitasTerakhir.current < WAKTU_TIMEOUT) return;
            if (pathname === '/login') return;

            sedangLogout.current = true;
            await supabase.auth.signOut();
            alert("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali demi keamanan.");
            router.replace('/login');
        };

        const interval = setInterval(cekIdle, INTERVAL_CEK);

        return () => {
            AKTIVITAS.forEach((event) => window.removeEventListener(event, catatAktivitas));
            clearInterval(interval);
        };
    }, [pathname, router]);

    return null;
}
