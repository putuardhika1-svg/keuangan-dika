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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Data tidak dapat dimuat. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
