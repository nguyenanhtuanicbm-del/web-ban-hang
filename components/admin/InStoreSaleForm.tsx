"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatVND } from "@/lib/format";
import type { Product } from "@/lib/types";

interface LineItem {
  productId: string;
  quantity: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Đang tạo đơn..." : "Tạo đơn bán hàng"}
    </button>
  );
}

export default function InStoreSaleForm({
  products,
  action,
}: {
  products: Product[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function addItem() {
    if (!selectedProductId) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === selectedProductId);
      if (existing) {
        return prev.map((i) =>
          i.productId === selectedProductId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: selectedProductId, quantity: 1 }];
    });
    setSelectedProductId("");
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = items.reduce((sum, i) => {
    const product = productMap.get(i.productId);
    return sum + (product ? product.price * i.quantity : 0);
  }, 0);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <div className="flex gap-2">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        >
          <option value="">Chọn sản phẩm...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock <= 0}>
              {p.name} — {formatVND(p.price)} (còn {p.stock})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addItem}
          className="rounded-md border border-brand-600 px-4 py-2 font-medium text-brand-600 hover:bg-brand-50"
        >
          Thêm
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
        {items.length === 0 && <p className="text-sm text-gray-400">Chưa chọn sản phẩm nào.</p>}
        {items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) return null;
          return (
            <div key={item.productId} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{product.name}</span>
              <input
                type="number"
                min={1}
                max={product.stock}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
              />
              <span className="w-24 text-right font-medium">
                {formatVND(product.price * item.quantity)}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="text-red-500 hover:text-red-700"
              >
                Xóa
              </button>
            </div>
          );
        })}
        {items.length > 0 && (
          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
            <span>Tổng cộng</span>
            <span className="text-brand-600">{formatVND(total)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tên khách (tùy chọn)
          </label>
          <input
            name="customer_name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Số điện thoại (tùy chọn)
          </label>
          <input
            name="phone"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
