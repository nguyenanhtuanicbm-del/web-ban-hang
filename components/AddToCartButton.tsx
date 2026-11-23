"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Product, Variant, formatVariantAttributes } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import QuantityStepper from "./QuantityStepper";

export default function AddToCartButton({
  product,
  variant,
}: {
  product: Product;
  variant: Variant;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const stock = variant.total_stock ?? 0;
  const outOfStock = stock <= 0;

  function handleAdd() {
    addItem({
      variantId: variant.id,
      productName: product.name,
      variantLabel: formatVariantAttributes(variant.attributes),
      slug: product.slug,
      price: variant.price ?? 0,
      image: product.images?.[0] ?? null,
      quantity,
      stock,
      unit: variant.unit || "Cái",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (outOfStock) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-md bg-gray-200 px-6 py-3 font-medium text-gray-500"
      >
        Hết hàng
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <QuantityStepper value={quantity} max={stock} unit={variant.unit || "Cái"} onChange={setQuantity} />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          <ShoppingCart className="h-4 w-4" />
          {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
        </button>
        <button
          onClick={() => {
            handleAdd();
            router.push("/gio-hang");
          }}
          className="rounded-md border border-brand-600 px-6 py-3 font-medium text-brand-600 transition hover:bg-brand-50"
        >
          Mua ngay
        </button>
      </div>
    </div>
  );
}
