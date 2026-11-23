"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductGrid from "./ProductGrid";
import type { Category, Product } from "@/lib/types";

/**
 * Lọc theo danh mục hoàn toàn ở client (không gọi lại server) — toàn bộ sản phẩm active đã
 * tải sẵn 1 lần từ trang cha (ISR cache 30s), nên bấm đổi danh mục phản hồi tức thì thay vì
 * phải đợi 1 vòng request/response mới như khi dùng điều hướng Link kiểu cũ.
 */
export default function ProductsBrowser({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const searchParams = useSearchParams();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get("danh-muc")
  );

  const filtered = useMemo(() => {
    if (!selectedSlug) return products;
    return products.filter((p) => p.category?.slug === selectedSlug);
  }, [products, selectedSlug]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Sản phẩm</h1>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedSlug(null)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
            !selectedSlug
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600"
          }`}
        >
          Tất cả
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => setSelectedSlug(category.slug)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              selectedSlug === category.slug
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <ProductGrid products={filtered} />
    </div>
  );
}
