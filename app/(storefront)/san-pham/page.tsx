import Link from "next/link";
import { getActiveProducts, getCategories } from "@/lib/queries";
import ProductGrid from "@/components/ProductGrid";

export const revalidate = 0;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ "danh-muc"?: string; q?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params["danh-muc"];
  const search = params.q;

  const [products, categories] = await Promise.all([
    getActiveProducts({ categorySlug, search }),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Sản phẩm</h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/san-pham"
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
            !categorySlug
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600"
          }`}
        >
          Tất cả
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/san-pham?danh-muc=${category.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              categorySlug === category.slug
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
