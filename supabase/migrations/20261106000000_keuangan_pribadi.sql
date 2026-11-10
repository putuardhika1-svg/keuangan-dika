-- Jalankan file ini satu kali di Supabase SQL Editor.
-- Aman dijalankan berulang (idempotent).

-- =========================================================
-- 1. TABEL ANGGARAN (BUDGET) PER USER
-- =========================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kategori text not null,
  batas numeric not null default 0 check (batas >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kategori)
);

alter table public.budgets enable row level security;

drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own"
  on public.budgets for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own"
  on public.budgets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own"
  on public.budgets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own"
  on public.budgets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =========================================================
-- 2. TABEL TRANSAKSI
-- =========================================================
create table if not exists public.transaksi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jenis text not null check (jenis in ('Pemasukan', 'Pengeluaran', 'Hutang', 'Piutang')),
  kategori text not null,
  jumlah numeric(14, 2) not null check (jumlah > 0),
  keterangan text not null default '-',
  tanggal date not null,
  metode_pembayaran text,
  detail_barang text,
  bukti_foto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lengkapi kolom untuk database lama yang belum memilikinya.
alter table public.transaksi add column if not exists metode_pembayaran text;
alter table public.transaksi add column if not exists detail_barang text;
alter table public.transaksi add column if not exists bukti_foto text;
alter table public.transaksi add column if not exists created_at timestamptz not null default now();
alter table public.transaksi add column if not exists updated_at timestamptz not null default now();

-- user_id otomatis dari sesi login. RLS tetap memeriksa nilainya,
-- jadi ini hanya lapisan pengaman tambahan untuk database lama.
alter table public.transaksi alter column user_id set default auth.uid();
alter table public.budgets alter column user_id set default auth.uid();

-- Pastikan database lama juga punya validasi nilai.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaksi'::regclass
      and contype = 'c'
      and conname in ('transaksi_jenis_check', 'transaksi_jenis_valid')
  ) then
    alter table public.transaksi
      add constraint transaksi_jenis_valid
      check (jenis in ('Pemasukan', 'Pengeluaran', 'Hutang', 'Piutang')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaksi'::regclass
      and contype = 'c'
      and conname in ('transaksi_jumlah_check', 'transaksi_jumlah_positif')
  ) then
    alter table public.transaksi
      add constraint transaksi_jumlah_positif
      check (jumlah > 0) not valid;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transaksi_set_updated_at on public.transaksi;
create trigger transaksi_set_updated_at
  before update on public.transaksi
  for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- =========================================================
-- 2b. RLS TABEL TRANSAKSI
-- =========================================================
alter table public.transaksi enable row level security;

drop policy if exists "transaksi_select_own" on public.transaksi;
create policy "transaksi_select_own"
  on public.transaksi for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "transaksi_insert_own" on public.transaksi;
create policy "transaksi_insert_own"
  on public.transaksi for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "transaksi_update_own" on public.transaksi;
create policy "transaksi_update_own"
  on public.transaksi for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transaksi_delete_own" on public.transaksi;
create policy "transaksi_delete_own"
  on public.transaksi for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists transaksi_user_tanggal_idx
  on public.transaksi (user_id, tanggal desc);

create index if not exists transaksi_user_jenis_idx
  on public.transaksi (user_id, jenis);

-- =========================================================
-- 3. BUCKET FOTO STRUK (PRIVATE)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti-struk',
  'bukti-struk',
  false,
  8388608,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bukti_struk_select_own" on storage.objects;
create policy "bukti_struk_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bukti-struk'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "bukti_struk_insert_own" on storage.objects;
create policy "bukti_struk_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bukti-struk'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "bukti_struk_update_own" on storage.objects;
create policy "bukti_struk_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'bukti-struk'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'bukti-struk'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "bukti_struk_delete_own" on storage.objects;
create policy "bukti_struk_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bukti-struk'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- =========================================================
-- 4. KUOTA SCAN STRUK PERSISTEN (10 PER MENIT PER USER)
-- =========================================================
-- Tabel ini sengaja tidak punya policy RLS. Akses hanya lewat
-- fungsi consume_scan_kuota() agar hitungan tidak bisa diakali.
create table if not exists public.scan_kuota (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  jumlah integer not null default 0 check (jumlah >= 0)
);

alter table public.scan_kuota enable row level security;

revoke all on table public.scan_kuota from anon, authenticated;

create or replace function public.consume_scan_kuota()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  batas integer := 10;
  baris public.scan_kuota;
begin
  if uid is null then
    return false;
  end if;

  insert into public.scan_kuota as k (user_id, window_start, jumlah)
  values (uid, now(), 1)
  on conflict (user_id) do update
    set jumlah = case
          when k.window_start < now() - interval '1 minute' then 1
          else k.jumlah + 1
        end,
        window_start = case
          when k.window_start < now() - interval '1 minute' then now()
          else k.window_start
        end
  returning * into baris;

  return baris.jumlah <= batas;
end;
$$;

revoke all on function public.consume_scan_kuota() from public;
revoke all on function public.consume_scan_kuota() from anon;
grant execute on function public.consume_scan_kuota() to authenticated;
