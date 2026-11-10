const PESAN_KUNCI_RAHASIA =
  'Konfigurasi Supabase salah: gunakan anon/publishable key, bukan service_role.';

function periksaKunciPublik(key: string): string {
  if (key.startsWith('sb_secret_') || key.startsWith('service_role')) {
    throw new Error(PESAN_KUNCI_RAHASIA);
  }

  const bagian = key.split('.');
  if (bagian.length !== 3) return key;

  try {
    const base64 = bagian[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    const payload = JSON.parse(atob(base64.padEnd(base64.length + padding, '='))) as {
      role?: string;
    };

    if (payload.role === 'service_role') {
      throw new Error(PESAN_KUNCI_RAHASIA);
    }
  } catch (error) {
    if (error instanceof Error && error.message === PESAN_KUNCI_RAHASIA) {
      throw error;
    }
    // Bukan JWT yang bisa dibaca (misalnya key format baru); biarkan Supabase memvalidasi.
  }

  return key;
}

export function bacaKonfigurasiSupabase(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi.');
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi.');

  return { url, anonKey: periksaKunciPublik(anonKey) };
}
