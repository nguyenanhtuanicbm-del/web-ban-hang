import { createClient } from "@/lib/supabase/server";
import { Category, Product, Variant } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getDefaultPriceListId(supabase: SupabaseServerClient): Promise<string | null> {
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
  supabase: SupabaseServerClient,
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

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export async function getActiveProducts(options?: {
  categorySlug?: string;
  search?: string;
}): Promise<Product[]> {
  const supabase = await createClient();

  const [category, defaultPriceListId] = await Promise.all([
    options?.categorySlug ? getCategoryBySlug(options.categorySlug) : Promise.resolve(null),
    getDefaultPriceListId(supabase),
  ]);

  if (options?.categorySlug && !category) return [];

  let query = supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category_id", category.id);
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, error } = await query;
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

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();

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

/** Giá thấp nhất trong các biến thể — dùng hiển thị "từ X đ" khi có nhiều biến thể. */
export function productMinPrice(product: Product): number {
  const prices = (product.variants ?? []).map((v) => v.price ?? 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function productTotalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (v.total_stock ?? 0), 0);
}
