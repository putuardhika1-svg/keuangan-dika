"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Terjadi error pada aplikasi:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm border-l-2 border-negative pl-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Buku Kas</p>
        <h1 className="mt-2 font-serif text-2xl">Data tidak dapat dimuat</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Terjadi kesalahan saat mengambil data. Coba muat ulang halaman ini.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
