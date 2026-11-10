import { createBrowserClient } from "@supabase/ssr";
import { bacaKonfigurasiSupabase } from "./config";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = bacaKonfigurasiSupabase();

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
