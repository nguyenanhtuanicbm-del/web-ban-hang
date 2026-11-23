import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/queries";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";

// Route param (không phải searchParams) nên Next.js cache theo từng slug — tối đa 30s dữ
// liệu cũ, chấp nhận được vì /api/orders luôn tính lại giá/tồn kho thật lúc đặt hàng.
export const revalidate = 30;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-8">
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href="/san-pham" className="hover:text-brand-600">
          Sản phẩm
        </Link>{" "}
        / <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 sm:grid-cols-2">
        <ProductGallery images={product.images ?? []} alt={product.name} />

        <div className="flex flex-col gap-4">
          <div>
            {product.category && (
              <Link
                href={`/san-pham?danh-muc=${product.category.slug}`}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>
          </div>

          <ProductPurchasePanel product={product} />

          {product.description && (
            <p className="whitespace-pre-line text-gray-700">{product.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
