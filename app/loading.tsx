export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Memuat data</span>
      </div>
    </main>
  );
}
