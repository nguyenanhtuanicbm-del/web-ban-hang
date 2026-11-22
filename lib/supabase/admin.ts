import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Dùng service role key — chỉ gọi trong code chạy trên server (route handlers,
 * server actions). Bỏ qua toàn bộ RLS nên không bao giờ import vào client component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
