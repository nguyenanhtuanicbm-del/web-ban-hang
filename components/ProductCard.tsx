import Link from "next/link";
import { Product } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { productMinPrice, productTotalStock } from "@/lib/queries";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = productTotalStock(product) <= 0;
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1;
  const price = productMinPrice(product);

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          className="h-full w-full transition group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded bg-gray-900/80 px-2 py-1 text-xs font-medium text-white">
            Hết hàng
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-brand-600">
            {hasMultipleVariants ? `Từ ${formatVND(price)}` : formatVND(price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
