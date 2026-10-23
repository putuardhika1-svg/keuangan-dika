import { createClient } from '@supabase/supabase-js';

// Mengambil kunci dari brankas .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Membuat jembatan koneksi
export const supabase = createClient(supabaseUrl, supabaseKey);