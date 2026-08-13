import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// Browser/client-side client. Uses @supabase/ssr so the session is stored
// in cookies (not localStorage), which server routes can read.
let browserSupabase: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabase() {
  if (!browserSupabase) {
    browserSupabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserSupabase;
}

// Server-side client with service role — bypasses RLS.
// ONLY use inside server routes (app/api/**), never expose to the browser.
export function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
