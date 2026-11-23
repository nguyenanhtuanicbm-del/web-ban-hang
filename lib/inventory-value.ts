import type { SupabaseClient } from "@supabase/supabase-js";
import { formatVariantAttributes } from "@/lib/types";

export interface StockValueRow {
  variantId: string;
  productName: string;
  categoryName: string | null;
  attrLabel: string;
  sku: string;
  quantity: number;
  costPrice: number;
  price: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface InventoryValueRow {
  variant_id: string;
  sku: string;
  attributes: Record<string, string>;
  cost_price: number;
  low_stock_threshold: number;
  is_active: boolean;
  total_quantity: number;
  product: { name: string; category: { name: string } | null } | null;
}

interface StockRowWithVariant {
  variant_id: string;
  quantity: number;
  variant: {
    sku: string;
    attributes: Record<string, string>;
    cost_price: number;
    low_stock_threshold: number;
    is_active: boolean;
    product: { name: string; category: { name: string } | null } | null;
  } | null;
}

/**
 * Lấy danh sách tồn kho + giá trị (số lượng × giá vốn) theo biến thể.
 * Không chọn kho (warehouseId undefined) -> đọc từ view `inventory_value` (đã cộng dồn mọi
 * kho sẵn, 1 query). Chọn 1 kho cụ thể -> join trực tiếp `inventory_stock` theo kho đó.
 */
export async function getStockValueRows(
  supabase: SupabaseClient,
  options: { warehouseId?: string; defaultPriceListId: string | null }
): Promise<StockValueRow[]> {
  const { warehouseId, defaultPriceListId } = options;

  if (!warehouseId) {
    const { data } = await supabase
      .from("inventory_value")
      .select("*, product:products(name, category:categories(name))");

    const rows = (data ?? []) as unknown as InventoryValueRow[];
    const variantIds = rows.map((r) => r.variant_id);
    const priceMap = await getPriceMap(supabase, defaultPriceListId, variantIds);

    return rows.map((r) => ({
      variantId: r.variant_id,
      productName: r.product?.name ?? "Sản phẩm",
      categoryName: r.product?.category?.name ?? null,
      attrLabel: formatVariantAttributes(r.attributes),
      sku: r.sku,
      quantity: r.total_quantity,
      costPrice: r.cost_price,
      price: priceMap.get(r.variant_id) ?? 0,
      lowStockThreshold: r.low_stock_threshold,
      isActive: r.is_active,
    }));
  }

  const { data } = await supabase
    .from("inventory_stock")
    .select(
      "variant_id, quantity, variant:product_variants(sku, attributes, cost_price, low_stock_threshold, is_active, product:products(name, category:categories(name)))"
    )
    .eq("warehouse_id", warehouseId);

  const rows = (data ?? []) as unknown as StockRowWithVariant[];
  const variantIds = rows.map((r) => r.variant_id);
  const priceMap = await getPriceMap(supabase, defaultPriceListId, variantIds);

  return rows.map((r) => ({
    variantId: r.variant_id,
    productName: r.variant?.product?.name ?? "Sản phẩm",
    categoryName: r.variant?.product?.category?.name ?? null,
    attrLabel: formatVariantAttributes(r.variant?.attributes ?? {}),
    sku: r.variant?.sku ?? "",
    quantity: r.quantity,
    costPrice: r.variant?.cost_price ?? 0,
    price: priceMap.get(r.variant_id) ?? 0,
    lowStockThreshold: r.variant?.low_stock_threshold ?? 5,
    isActive: r.variant?.is_active ?? true,
  }));
}

async function getPriceMap(
  supabase: SupabaseClient,
  defaultPriceListId: string | null,
  variantIds: string[]
): Promise<Map<string, number>> {
  if (!defaultPriceListId || variantIds.length === 0) return new Map();

  const { data } = await supabase
    .from("price_list_items")
    .select("variant_id, price")
    .eq("price_list_id", defaultPriceListId)
    .in("variant_id", variantIds);

  return new Map((data ?? []).map((p) => [p.variant_id, p.price]));
}

export function filterStockValueRows(rows: StockValueRow[], search?: string): StockValueRow[] {
  if (!search) return rows;
  const needle = search.toLowerCase();
  return rows.filter(
    (r) => r.productName.toLowerCase().includes(needle) || r.sku.toLowerCase().includes(needle)
  );
}

export function sortStockValueRowsByValueDesc(rows: StockValueRow[]): StockValueRow[] {
  return [...rows].sort((a, b) => b.quantity * b.costPrice - a.quantity * a.costPrice);
}

export function stockValueTotals(rows: StockValueRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc.quantity += r.quantity;
      acc.costValue += r.quantity * r.costPrice;
      acc.retailValue += r.quantity * r.price;
      if (r.quantity > 0) acc.skuCount += 1;
      return acc;
    },
    { quantity: 0, costValue: 0, retailValue: 0, skuCount: 0 }
  );
}
