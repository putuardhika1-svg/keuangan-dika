"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { pesanError } from "@/utils/format";
import { Loader2, Save } from "lucide-react";

export default function ResetPassword() {
  const router = useRouter();
  const [memeriksa, setMemeriksa] = useState(true);
  const [siap, setSiap] = useState(false);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let aktif = true;
    let pemulihan = false;

    const hash = window.location.hash;
    const query = window.location.search;
    const adaPenandaPemulihan =
      hash.includes("type=recovery") ||
      query.includes("type=recovery") ||
      query.includes("code=");

    const selesai = () => {
      if (aktif) setMemeriksa(false);
    };

    const bersihkanUrl = () => {
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    // Beri waktu untuk pertukaran kode PKCE sebelum menyatakan tautan tidak valid.
    const timer = window.setTimeout(selesai, 5000);

    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return;

      if (data.session && (adaPenandaPemulihan || pemulihan)) {
        setSiap(true);
        bersihkanUrl();
        window.clearTimeout(timer);
        selesai();
      } else if (!adaPenandaPemulihan) {
        window.clearTimeout(timer);
        selesai();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!aktif) return;

      if (event === "PASSWORD_RECOVERY") pemulihan = true;

      if (pemulihan || (adaPenandaPemulihan && session)) {
        setSiap(true);
        bersihkanUrl();
        window.clearTimeout(timer);
        selesai();
      }
    });

    return () => {
      aktif = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan("");

    if (password.length < 8) {
      setPesan("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== konfirmasi) {
      setPesan("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      setPesan(pesanError(error, "Gagal menyimpan kata sandi baru."));
    } finally {
      setLoading(false);
    }
  };

  if (memeriksa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Memeriksa tautan</span>
        </div>
      </main>
    );
  }

  if (!siap) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12 text-ink">
        <div className="w-full max-w-sm border-l-2 border-warning pl-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Akun</p>
          <h1 className="mt-2 font-serif text-2xl">Tautan tidak valid</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Tautan reset sudah kedaluwarsa atau sudah dipakai. Minta tautan baru dari halaman lupa password.
          </p>
          <Link
            href="/lupa-password"
            className="mt-5 inline-flex rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Minta tautan baru
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12 text-ink">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Akun</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">Kata sandi baru</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Minimal 8 karakter. Setelah disimpan, masuk kembali dengan kata sandi baru.
        </p>

        {pesan && (
          <div className="mt-6 border-l-2 border-negative pl-3 text-sm text-negative" role="alert">
            {pesan}
          </div>
        )}

        <form onSubmit={simpan} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Kata sandi baru
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="konfirmasi" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Ulangi kata sandi
            </label>
            <input
              id="konfirmasi"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            {loading ? "Menyimpan..." : "Simpan kata sandi"}
          </button>
        </form>
      </div>
    </main>
  );
}
