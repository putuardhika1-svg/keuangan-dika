"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Wallet, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace('/');
        });
    }, [router]);

    const tanganiLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // Proses mencocokkan kunci dengan brankas Supabase
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            const pesan = error.message.toLowerCase();
            if (pesan.includes('email not confirmed')) {
                setErrorMsg("Email belum dikonfirmasi. Cek inbox Anda terlebih dahulu.");
            } else if (pesan.includes('invalid login credentials')) {
                setErrorMsg("Email atau Password salah!");
            } else {
                setErrorMsg(error.message || "Gagal masuk. Coba lagi.");
            }
            setLoading(false);
        } else {
            // Jika berhasil, arahkan ke halaman utama
            router.replace('/');
            router.refresh();
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <Wallet size={32} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-2">Keuangan Dika</h1>
                <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">Silakan masuk untuk mengakses data finansial Anda.</p>

                {errorMsg && (
                    <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={tanganiLogin} className="space-y-5">
                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="Masukkan email Anda"
                                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 pl-10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 pl-10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl mt-4 transition-colors shadow-lg flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Masuk ke Aplikasi"}
                    </button>
                </form>

            </div>
        </main>
    );
}