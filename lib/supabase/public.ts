import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client KHÔNG đọc cookie — chỉ dùng cho truy vấn công khai (storefront, dữ liệu
 * anon ai cũng xem được). Quan trọng: gọi cookies() (như trong lib/supabase/server.ts)
 * sẽ ép Next.js render trang hoàn toàn động (bỏ qua `export const revalidate`), nên các
 * trang công khai muốn cache/ISR được phải tránh đụng tới cookies() hoàn toàn.
 * Không dùng client này cho bất kỳ truy vấn nào cần phiên đăng nhập admin.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
