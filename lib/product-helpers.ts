import type { Product } from "@/lib/types";

/** Giá thấp nhất trong các biến thể — dùng hiển thị "từ X đ" khi có nhiều biến thể. */
export function productMinPrice(product: Product): number {
  const prices = (product.variants ?? []).map((v) => v.price ?? 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function productTotalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (v.total_stock ?? 0), 0);
}
