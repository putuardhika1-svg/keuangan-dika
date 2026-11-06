import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="border-l-2 border-line pl-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Buku Kas</p>
        <h1 className="mt-2 font-serif text-2xl">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted">Tautan yang Anda buka mungkin sudah tidak tersedia.</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Kembali ke ringkasan
        </Link>
      </div>
    </main>
  );
}
