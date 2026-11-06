"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
  }, [router]);

  const tanganiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const pesan = error.message.toLowerCase();
      if (pesan.includes("email not confirmed")) {
        setErrorMsg("Email belum dikonfirmasi. Cek inbox Anda terlebih dahulu.");
      } else if (pesan.includes("invalid login credentials")) {
        setErrorMsg("Email atau password salah.");
      } else {
        setErrorMsg(error.message || "Gagal masuk. Coba lagi.");
      }
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between bg-[#14201b] px-12 py-10 text-[#f1f3ef] lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f1f3ef] font-serif text-lg text-[#14201b]">B</span>
          <span className="font-serif text-xl tracking-tight">Buku Kas</span>
        </div>

        <div className="max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Catatan keuangan pribadi</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05]">Uang yang rapi, keputusan yang tenang.</h1>
          <p className="mt-6 text-sm leading-relaxed text-white/60">
            Catat pemasukan dan pengeluaran, pantau anggaran, dan lihat arus kas bulan ini dalam satu buku.
          </p>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          Buku Kas · {new Date().getFullYear()}
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-serif text-lg text-paper">B</span>
            <span className="font-serif text-xl">Buku Kas</span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Akun</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight">Masuk</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Gunakan akun yang sama dengan data keuangan Anda.
          </p>

          {errorMsg && (
            <div className="mt-6 border-l-2 border-negative pl-3 text-sm text-negative" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={tanganiLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@email.com"
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Sesi diamankan oleh Supabase Auth
          </p>
        </div>
      </section>
    </main>
  );
}
