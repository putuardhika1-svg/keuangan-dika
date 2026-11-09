# Buku Kas — Keuangan Pribadi

Aplikasi pencatatan keuangan pribadi berbasis Next.js App Router, Supabase, dan Gemini (scan struk).

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya.
2. Jalankan migration `supabase/migrations/20261106000000_keuangan_pribadi.sql` di SQL Editor Supabase. File ini aman dijalankan berulang dan membuat:
   - tabel `transaksi` + RLS + index,
   - tabel `budgets` + RLS,
   - bucket private `bukti-struk` + policy.
3. Pasang dependensi dan jalankan:

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | Anon key Supabase (bukan service_role) |
| `GEMINI_API_KEY` | Ya untuk scan struk | API key Google AI Studio |
| `GEMINI_MODEL` | Tidak | Default `gemini-2.5-flash`; ada fallback otomatis ke model Flash lain |

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

## Catatan perilaku

- Scan struk dibatasi 10 permintaan/menit per pengguna (limiter in-memory per instance).
- Ukuran foto struk maksimal 8 MB dan otomatis dikompres di browser.
- Sesi keluar otomatis setelah 15 menit tanpa aktivitas.
- Foto struk disimpan di bucket private `bukti-struk`; aplikasi membuat signed URL saat menampilkan.
