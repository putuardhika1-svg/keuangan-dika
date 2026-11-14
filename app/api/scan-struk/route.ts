import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pesanError } from '@/utils/format';
import { bacaKonfigurasiSupabase } from '@/utils/supabase/config';
import {
  ekstrakDariGambar,
  MIME_DIIZINKAN,
  UKURAN_MAKS_FILE,
} from '@/utils/ai/ekstrak-transaksi';

export const maxDuration = 60;

const batasPermintaan = new Map<string, number[]>();
const BATAS_PER_MENIT = 10;
const JENDELA_MS = 60_000;

function bolehMeminta(userId: string): boolean {
  const sekarang = Date.now();
  const riwayat = (batasPermintaan.get(userId) ?? []).filter((waktu) => sekarang - waktu < JENDELA_MS);

  if (riwayat.length >= BATAS_PER_MENIT) {
    batasPermintaan.set(userId, riwayat);
    return false;
  }

  riwayat.push(sekarang);
  batasPermintaan.set(userId, riwayat);

  if (batasPermintaan.size > 1000) {
    for (const [kunci, nilai] of batasPermintaan) {
      if (nilai.every((waktu) => sekarang - waktu >= JENDELA_MS)) {
        batasPermintaan.delete(kunci);
      }
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    let supabaseUrl = '';
    let supabaseAnonKey = '';

    try {
      ({ url: supabaseUrl, anonKey: supabaseAnonKey } = bacaKonfigurasiSupabase());
    } catch (error) {
      return NextResponse.json({ error: pesanError(error) }, { status: 500 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Konfigurasi Gemini API belum lengkap.' }, { status: 500 });
    }

    // ==========================================
    // PENGAMANAN RUTE C: CEK SESI LOGIN DARI TOKEN
    // ==========================================
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return NextResponse.json({ error: "Akses ditolak. Kunci akses tidak ditemukan." }, { status: 401 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("Akses Ditolak: Token tidak valid.");
      return NextResponse.json({ error: "Akses ditolak. Sesi Anda tidak valid." }, { status: 401 });
    }

    // Limiter utama: tabel scan_kuota lewat RPC, sehingga tetap berlaku
    // antar instance server. Limiter in-memory hanya menjadi cadangan
    // kalau migration terbaru belum dijalankan.
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: bolehScan, error: errorKuota } = await supabaseUser.rpc('consume_scan_kuota');

    if (errorKuota) {
      console.warn('Kuota scan database tidak tersedia, memakai limiter in-memory.', errorKuota.message);
      if (!bolehMeminta(user.id)) {
        return NextResponse.json(
          { error: "Terlalu banyak permintaan scan. Coba lagi dalam satu menit." },
          { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
        );
      }
    } else if (bolehScan === false) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan scan. Coba lagi dalam satu menit." },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
      );
    }
    // ==========================================

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    const batasBody = UKURAN_MAKS_FILE + 1024 * 1024;

    if (Number.isFinite(contentLength) && contentLength > batasBody) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 8 MB" },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }

    if (file.size > UKURAN_MAKS_FILE) {
      return NextResponse.json({ error: "Ukuran file maksimal 8 MB" }, { status: 413 });
    }

    const mimeType = file.type.toLowerCase();

    if (!MIME_DIIZINKAN.has(mimeType)) {
      return NextResponse.json({ error: "Format gambar tidak didukung" }, { status: 415 });
    }

    const buffer = await file.arrayBuffer();
    const data = await ekstrakDariGambar({ apiKey, buffer, mimeType });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error("API Error:", error);

    const detail = pesanError(error, '');
    const layananSibuk = /503|high demand|overloaded|service unavailable|unavailable|timeout|timed out|deadline|aborted/i.test(detail);

    return NextResponse.json(
      {
        error: layananSibuk
          ? "Layanan AI sedang sibuk (overloaded). Coba lagi beberapa menit."
          : "Gagal memproses gambar. Silakan coba lagi.",
      },
      { status: layananSibuk ? 503 : 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
