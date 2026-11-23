import { Suspense } from "react";
import { getActiveProducts, getCategories } from "@/lib/queries";
import ProductsBrowser from "@/components/ProductsBrowser";

// Không đọc searchParams (lọc danh mục làm ở client) nên trang này cache được 30s như trang chủ.
export const revalidate = 30;

export default async function ProductsPage() {
  // Trang này được Next.js tiền xử lý lúc build — xem giải thích ở app/(storefront)/page.tsx.
  let products: Awaited<ReturnType<typeof getActiveProducts>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  } catch (error) {
    console.error("Không tải được sản phẩm/danh mục cho trang danh sách:", error);
  }

  return (
    <Suspense>
      <ProductsBrowser products={products} categories={categories} />
    </Suspense>
  );
}
