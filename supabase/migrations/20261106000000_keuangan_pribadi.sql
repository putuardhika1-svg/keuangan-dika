-- Jalankan file ini satu kali di Supabase SQL Editor.
-- Aman dijalankan berulang (idempotent).

-- =========================================================
-- 1. TABEL ANGGARAN (BUDGET) PER USER
-- =========================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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
-- 2. RLS TABEL TRANSAKSI
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
insert into storage.buckets (id, name, public)
values ('bukti-struk', 'bukti-struk', false)
on conflict (id) do nothing;

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
