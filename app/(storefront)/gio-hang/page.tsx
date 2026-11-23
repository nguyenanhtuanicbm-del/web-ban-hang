"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCartStore, useCartHydrated, cartTotal } from "@/store/cart";
import { formatVND } from "@/lib/format";
import ProductImage from "@/components/ProductImage";
import QuantityStepper from "@/components/QuantityStepper";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const hydrated = useCartHydrated();

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-gray-600">Giỏ hàng của bạn đang trống.</p>
        <Link
          href="/san-pham"
          className="rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Giỏ hàng</h1>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 p-3"
          >
            <ProductImage
              src={item.image}
              alt={item.productName}
              className="h-20 w-20 flex-shrink-0 rounded-md"
            />
            <div className="min-w-[140px] flex-1">
              <Link href={`/san-pham/${item.slug}`} className="font-medium text-gray-900 hover:text-brand-600">
                {item.productName}
              </Link>
              {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
              <p className="mt-1 text-sm text-gray-500">{formatVND(item.price)}</p>
            </div>
            <div className="flex items-center gap-4">
              <QuantityStepper
                value={item.quantity}
                max={item.stock}
                onChange={(q) => updateQuantity(item.variantId, q)}
              />
              <div className="w-24 text-right font-medium text-gray-900">
                {formatVND(item.price * item.quantity)}
              </div>
              <button
                onClick={() => removeItem(item.variantId)}
                className="p-2 text-gray-400 hover:text-red-600"
                aria-label="Xóa sản phẩm"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-end gap-3 border-t border-gray-200 pt-4">
        <div className="text-lg font-semibold text-gray-900">
          Tổng cộng: <span className="text-brand-600">{formatVND(cartTotal(items))}</span>
        </div>
        <Link
          href="/thanh-toan"
          className="rounded-md bg-brand-600 px-8 py-3 font-medium text-white hover:bg-brand-700"
        >
          Tiến hành thanh toán
        </Link>
      </div>
    </div>
  );
}
