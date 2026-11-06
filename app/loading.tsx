export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <span className="text-sm font-medium">Memuat data keuangan...</span>
      </div>
    </main>
  );
}
