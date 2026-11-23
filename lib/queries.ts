import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { Category, Product, Variant } from "@/lib/types";

async function getDefaultPriceListId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("price_lists")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Gắn giá bán lẻ (bảng giá mặc định) + tổng tồn kho mọi kho vào từng biến thể.
 * Tránh cú pháp filter trên embedded resource của PostgREST (dễ sai khi không
 * test trực tiếp trên DB thật) — query riêng rồi merge ở application layer.
 * Nhận `defaultPriceListId` làm tham số (thay vì tự fetch) để nơi gọi có thể
 * lấy nó song song với truy vấn sản phẩm chính, giảm số round-trip nối tiếp.
 */
async function attachPricingAndStock(
  supabase: SupabaseClient,
  variants: Variant[],
  defaultPriceListId: string | null
): Promise<Variant[]> {
  if (variants.length === 0) return variants;

  const variantIds = variants.map((v) => v.id);

  const [priceItemsResult, stockTotalsResult] = await Promise.all([
    defaultPriceListId
      ? supabase
          .from("price_list_items")
          .select("variant_id, price")
          .eq("price_list_id", defaultPriceListId)
          .in("variant_id", variantIds)
      : Promise.resolve({ data: [] as { variant_id: string; price: number }[] }),
    supabase.from("variant_total_stock").select("variant_id, total_quantity").in("variant_id", variantIds),
  ]);

  const priceMap = new Map((priceItemsResult.data ?? []).map((p) => [p.variant_id, p.price]));
  const stockMap = new Map(
    (stockTotalsResult.data ?? []).map((s) => [s.variant_id, s.total_quantity])
  );

  return variants.map((v) => ({
    ...v,
    price: priceMap.get(v.id) ?? 0,
    total_stock: stockMap.get(v.id) ?? 0,
  }));
}

// ===== Truy vấn công khai (storefront) — dùng client KHÔNG cookie để trang có thể
// static/ISR cache theo `export const revalidate` của từng page. =====

export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Lấy toàn bộ sản phẩm active — lọc theo danh mục được làm ở client (xem ProductsBrowser). */
export async function getActiveProducts(): Promise<Product[]> {
  const supabase = createPublicClient();

  const [{ data, error }, defaultPriceListId] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    getDefaultPriceListId(supabase),
  ]);
  if (error) throw error;

  const products = (data ?? []) as Product[];
  const allVariants = products.flatMap((p) => (p.variants ?? []).filter((v) => v.is_active));
  const priced = await attachPricingAndStock(supabase, allVariants, defaultPriceListId);
  const pricedById = new Map(priced.map((v) => [v.id, v]));

  return products.map((p) => ({
    ...p,
    variants: (p.variants ?? [])
      .filter((v) => v.is_active)
      .map((v) => pricedById.get(v.id) ?? v),
  }));
}

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  minPrice: number;
}

/** Gợi ý sản phẩm theo từ khóa — dùng cho ô tìm kiếm có autocomplete trên storefront. */
export async function searchProductSuggestions(query: string, limit = 6): Promise<ProductSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createPublicClient();

  const [{ data, error }, defaultPriceListId] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, images, variants:product_variants(id, is_active)")
      .eq("is_active", true)
      .ilike("name", `%${q}%`)
      .limit(limit),
    getDefaultPriceListId(supabase),
  ]);
  if (error || !data) return [];

  type Row = { id: string; name: string; slug: string; images: string[]; variants: { id: string; is_active: boolean }[] };
  const products = data as unknown as Row[];
  const variantIds = products.flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => v.id));

  let priceMap = new Map<string, number>();
  if (defaultPriceListId && variantIds.length > 0) {
    const { data: priceItems } = await supabase
      .from("price_list_items")
      .select("variant_id, price")
      .eq("price_list_id", defaultPriceListId)
      .in("variant_id", variantIds);
    priceMap = new Map((priceItems ?? []).map((p) => [p.variant_id, p.price]));
  }

  return products.map((p) => {
    const prices = p.variants.filter((v) => v.is_active).map((v) => priceMap.get(v.id) ?? 0);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.images?.[0] ?? null,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    };
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();

  const [productResult, defaultPriceListId] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle(),
    getDefaultPriceListId(supabase),
  ]);

  if (!productResult.data) return null;

  const product = productResult.data as Product;
  const activeVariants = (product.variants ?? []).filter((v) => v.is_active);
  const priced = await attachPricingAndStock(supabase, activeVariants, defaultPriceListId);

  return { ...product, variants: priced };
}

// ===== Truy vấn quản trị — dùng client có cookie (phiên đăng nhập) vì cần thấy cả
// sản phẩm đang ẩn, luôn render động (không cache). =====

/** Dùng cho trang quản trị — lấy tất cả sản phẩm (kể cả đang ẩn) kèm mọi biến thể. */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  const supabase = await createClient();

  const [{ data, error }, defaultPriceListId] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .order("created_at", { ascending: false }),
    getDefaultPriceListId(supabase),
  ]);
  if (error) throw error;

  const products = (data ?? []) as Product[];
  const allVariants = products.flatMap((p) => p.variants ?? []);
  const priced = await attachPricingAndStock(supabase, allVariants, defaultPriceListId);
  const pricedById = new Map(priced.map((v) => [v.id, v]));

  return products.map((p) => ({
    ...p,
    variants: (p.variants ?? []).map((v) => pricedById.get(v.id) ?? v),
  }));
}

/** Dùng cho trang sửa sản phẩm trong admin — kèm biến thể đang ẩn để còn chỉnh/kích hoạt lại. */
export async function getProductByIdForAdmin(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const [productResult, defaultPriceListId] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("id", id)
      .maybeSingle(),
    getDefaultPriceListId(supabase),
  ]);

  if (!productResult.data) return null;

  const product = productResult.data as Product;
  const priced = await attachPricingAndStock(supabase, product.variants ?? [], defaultPriceListId);
  return { ...product, variants: priced };
}
