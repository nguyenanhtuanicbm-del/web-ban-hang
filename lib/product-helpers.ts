import type { Product } from "@/lib/types";

/** Giá thấp nhất trong các biến thể — dùng hiển thị "từ X đ" khi có nhiều biến thể. */
export function productMinPrice(product: Product): number {
  const prices = (product.variants ?? []).map((v) => v.price ?? 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function productTotalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (v.total_stock ?? 0), 0);
}

/** Đơn vị tính hiển thị cho sản phẩm — lấy từ biến thể đầu tiên (đa số sản phẩm dùng 1 đơn vị). */
export function productUnit(product: Product): string {
  return product.variants?.[0]?.unit || "Cái";
}
