"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { pesanError } from "@/utils/format";
import { ArrowLeft, Loader2, Send } from "lucide-react";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [pesan, setPesan] = useState("");

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPesan("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setTerkirim(true);
    } catch (error) {
      setPesan(pesanError(error, "Gagal mengirim tautan reset."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12 text-ink">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-ink">
          <ArrowLeft size={14} /> Kembali ke halaman masuk
        </Link>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Akun</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">Lupa password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Masukkan email akun. Kami akan mengirim tautan untuk membuat kata sandi baru.
        </p>

        {terkirim ? (
          <div className="mt-6 border-l-2 border-positive pl-3 text-sm leading-relaxed text-positive" role="status">
            Jika email tersebut terdaftar, tautan reset sudah dikirim. Periksa inbox dan folder spam.
          </div>
        ) : (
          <>
            {pesan && (
              <div className="mt-6 border-l-2 border-negative pl-3 text-sm text-negative" role="alert">
                {pesan}
              </div>
            )}

            <form onSubmit={kirim} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                {loading ? "Mengirim..." : "Kirim tautan reset"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
