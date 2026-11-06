import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Tautan yang Anda buka mungkin sudah tidak tersedia.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );
}
