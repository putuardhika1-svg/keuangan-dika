# Buku Kas — Keuangan Pribadi

Aplikasi pencatatan keuangan pribadi berbasis Next.js App Router, Supabase, dan Gemini (scan struk).

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya.
2. Jalankan migration `supabase/migrations/20261106000000_keuangan_pribadi.sql` di SQL Editor Supabase. File ini aman dijalankan berulang dan membuat:
   - tabel `transaksi` + RLS + index,
   - tabel `budgets` + RLS,
   - tabel `scan_kuota` + fungsi rate limit scan struk,
   - bucket private `bukti-struk` + limit 8 MB + policy.
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
| `GEMINI_MODEL` | Tidak | Default `gemini-3.8-flash`; ada fallback otomatis ke model Flash lain |

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

## Catatan perilaku

- Scan struk dibatasi 10 permintaan/menit per pengguna. Limiter utama ada di database (`scan_kuota` + `consume_scan_kuota()`), dengan fallback in-memory kalau migration terbaru belum dijalankan.
- Ukuran foto struk maksimal 8 MB dan dibatasi juga di level bucket Storage.
- Sesi keluar otomatis setelah 15 menit tanpa aktivitas.
- Foto struk disimpan di bucket private `bukti-struk`; aplikasi membuat signed URL saat menampilkan.
- Ganti kata sandi memerlukan kata sandi saat ini.
- Tersedia alur lupa password (`/lupa-password`) dan reset password (`/reset-password`).
- Font IBM Plex dan Newsreader disimpan lokal di `app/fonts`, jadi `next dev` tidak bergantung pada akses ke Google Fonts.
- Jika scan struk gagal karena Gemini `high demand`, ganti `GEMINI_MODEL` ke `gemini-3.6-flash` atau `gemini-3.5-flash`. Fallback otomatis juga mencoba model lain.

## Keamanan: anon key atau service_role?

**Anon/publishable key aman dipakai di browser.** Key ini memang dirancang publik dan akan terlihat di bundle JavaScript. Keamanan data bergantung pada RLS (Row Level Security), bukan pada kerahasiaan anon key.

**Jangan pernah memakai `service_role` / `sb_secret_...` di `NEXT_PUBLIC_*` atau kode client.** Key tersebut melewati RLS dan memberi akses penuh ke database. Aplikasi ini tidak membutuhkannya.

| Key | Boleh di browser? | Keterangan |
| --- | --- | --- |
| `anon` / `sb_publishable_...` | Ya | Dibatasi RLS |
| `service_role` / `sb_secret_...` | Tidak | Bypass RLS, akses penuh |
| `GEMINI_API_KEY` | Tidak | Hanya untuk route server `/api/scan-struk` |

Aplikasi juga punya pengaman di `utils/supabase/config.ts`: kalau `NEXT_PUBLIC_SUPABASE_ANON_KEY` ternyata berisi `service_role`, aplikasi akan berhenti dengan pesan error, bukan diam-diam membocorkan database.

## Tutorial: jalankan ulang migration

Migration lama tetap kompatibel. Jalankan ulang seluruh isi file ini di Supabase SQL Editor:

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Copy seluruh isi `supabase/migrations/20261106000000_keuangan_pribadi.sql`.
3. Klik **Run**. File ini idempotent, jadi aman dijalankan berulang.

Yang ditambahkan oleh versi terbaru:

- Bucket `bukti-struk` dipaksa **private**, dengan limit **8 MB** dan MIME gambar saja.
- `user_id` di `transaksi` dan `budgets` otomatis memakai `auth.uid()` sebagai default.
- Tabel `scan_kuota` + fungsi `consume_scan_kuota()` untuk rate limit scan struk yang persisten antar instance server.

Verifikasi setelah migration:

```sql
-- RLS harus true
select relname, relrowsecurity
from pg_class
where relname in ('transaksi', 'budgets', 'scan_kuota');

-- Bucket harus private dan punya limit
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'bukti-struk';

-- Policy harus ada
select policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in ('transaksi', 'budgets', 'objects');

-- Fungsi kuota harus ada
select proname from pg_proc where proname = 'consume_scan_kuota';
```

Kalau `consume_scan_kuota` belum ada, API tetap berjalan memakai limiter in-memory, tetapi limit tidak konsisten antar instance server dan akan muncul warning di log.

## Tutorial: checklist Supabase Dashboard

Lakukan sekali untuk project produksi:

### Authentication

1. **Authentication → Providers → Email**
   - Kalau ini aplikasi pribadi, matikan **Allow new users to sign up**.
   - Kalau ingin mengundang keluarga/teman, biarkan menyala tetapi tambahkan pembatasan sendiri.
2. **Authentication → Settings**
   - Aktifkan **Confirm email**.
   - Aktifkan **Leaked password protection**.
   - Set minimal password **8 karakter** (samakan dengan validasi aplikasi).
3. **Authentication → URL Configuration**
   - **Site URL**: `https://domain-anda.com`
   - **Redirect URLs**, tambahkan:
     - `http://localhost:3000/reset-password`
     - `https://domain-anda.com/reset-password`

Tanpa redirect URL ini, tautan reset password akan ditolak atau kembali ke halaman yang salah.

### Storage

1. Buka **Storage → bukti-struk**.
2. Pastikan **Public bucket: OFF**.
3. Pastikan limit file 8 MB dan allowed MIME types hanya gambar.
4. Migration terbaru sudah mengatur ini otomatis, tetapi cek ulang di dashboard.

### Database

1. Buka **Database → Tables**.
2. Pastikan RLS **enabled** untuk `transaksi`, `budgets`, dan `scan_kuota`.
3. `scan_kuota` sengaja tidak punya policy; akses hanya lewat fungsi `consume_scan_kuota()`.

### API keys

1. Buka **Project Settings → API**.
2. Ambil **anon/publishable key**, bukan service_role.
3. Simpan `GEMINI_API_KEY` hanya di environment server (Vercel/hosting), jangan di `NEXT_PUBLIC_*`.

### Backup dan log

1. Aktifkan backup/PITR sesuai paket Supabase.
2. Pantau **Logs → Auth**, **API**, dan **Storage** kalau ada aktivitas mencurigakan.

## Tutorial: alur lupa dan reset password

Alur yang sudah tersedia:

1. User membuka `/lupa-password`.
2. User memasukkan email. Aplikasi memanggil `supabase.auth.resetPasswordForEmail()` dengan redirect ke `/reset-password`.
3. Supabase mengirim email berisi tautan reset.
4. User membuka tautan. `@supabase/ssr` mendeteksi sesi pemulihan, lalu halaman `/reset-password` menampilkan form kata sandi baru.
5. Setelah disimpan, aplikasi sign out dan mengarahkan user ke `/login`.

Yang perlu disiapkan:

- Redirect URL `/reset-password` di Supabase (lihat checklist di atas).
- Email SMTP. Untuk produksi, gunakan **Authentication → Settings → SMTP Settings** dengan penyedia email sendiri. Email bawaan Supabase punya batas pengiriman yang rendah.
- Kalau tautan selalu berakhir di `/login` atau “Tautan tidak valid”:
  - pastikan Site URL dan Redirect URLs benar,
  - pastikan tautan email memakai template default Supabase,
  - coba minta tautan baru karena tautan lama bisa kedaluwarsa.

## Tutorial: verifikasi anon key tidak bisa membaca data orang lain

Jalankan dari terminal. Ganti `<PROJECT_REF>` dan `<ANON_KEY>`.

```bash
curl "https://<PROJECT_REF>.supabase.co/rest/v1/transaksi?select=*" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

Hasil yang benar: `[]` atau error izin, **bukan** daftar transaksi. Kalau data muncul, RLS/policy bermasalah dan harus diperbaiki sebelum aplikasi dipakai publik.

Uji juga apakah signup publik masih terbuka:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"tes-<random>@example.com\",\"password\":\"password-panjang-123\"}"
```

Kalau berhasil membuat akun baru, berarti signup publik masih aktif. Matikan di dashboard kalau aplikasi ini hanya untuk Anda.

## Catatan CSP

`next.config.ts` sekarang mengirim `Content-Security-Policy` yang:

- hanya mengizinkan script dari aplikasi sendiri (plus inline yang dibutuhkan Next.js),
- mengizinkan style dari aplikasi sendiri dan inline (Tailwind),
- mengizinkan gambar dari Supabase dan `blob:`/`data:`,
- mengizinkan koneksi ke Supabase,
- melarang halaman di-embed (`frame-ancestors 'none'`).

`script-src` masih memakai `'unsafe-inline'` karena Next.js menyisipkan inline script, dan `style-src` juga memakai `'unsafe-inline'` untuk Tailwind/inline style. Kalau nanti ingin lebih ketat, langkah berikutnya adalah CSP berbasis nonce lewat `proxy.ts` dan meneruskan nonce ke inline theme script di `app/layout.tsx`.

Kalau memakai custom domain Supabase, analytics, atau penyedia gambar eksternal, tambahkan domainnya ke `img-src`/`connect-src`/`script-src` di `next.config.ts`, kalau tidak akan diblokir browser.

## Yang belum dikerjakan

- Generate tipe database Supabase (`supabase gen types typescript`) dan memakai `createBrowserClient<Database>`.
- Test otomatis (unit untuk `utils/format.ts`, smoke test login/reset).
- Pagination/pencarian transaksi; saat ini semua transaksi milik user diambil sekaligus.
- Import CSV/restore backup (saat ini baru ekspor).
- Hapus akun + cleanup foto di Storage.
- MFA dan daftar sesi aktif.
- Konfirmasi password baru di halaman pengaturan (saat ini sudah ada verifikasi password lama).
