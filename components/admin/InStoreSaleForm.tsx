"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatVND } from "@/lib/format";
import { formatVariantAttributes, PAYMENT_METHOD_LABEL, type PaymentMethod, type Product } from "@/lib/types";

interface LineItem {
  variantId: string;
  quantity: number;
}

interface FlatVariantOption {
  variantId: string;
  label: string;
  price: number;
  stock: number;
  unit: string;
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

function flattenOptions(products: Product[]): FlatVariantOption[] {
  const options: FlatVariantOption[] = [];
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const attrLabel = formatVariantAttributes(variant.attributes);
      options.push({
        variantId: variant.id,
        label: attrLabel ? `${product.name} - ${attrLabel}` : product.name,
        price: variant.price ?? 0,
        stock: variant.total_stock ?? 0,
        unit: variant.unit || "Cái",
      });
    }
  }
  return options;
}

export default function InStoreSaleForm({
  products,
  action,
}: {
  products: Product[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const options = useMemo(() => flattenOptions(products), [products]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const optionMap = useMemo(() => new Map(options.map((o) => [o.variantId, o])), [options]);

  function addItem() {
    if (!selectedVariantId) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === selectedVariantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === selectedVariantId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { variantId: selectedVariantId, quantity: 1 }];
    });
    setSelectedVariantId("");
  }

  function updateQuantity(variantId: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0.001, quantity) } : i))
    );
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const total = items.reduce(
    (sum, i) => sum + (optionMap.get(i.variantId)?.price ?? 0) * i.quantity,
    0
  );

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <input type="hidden" name="payment_method" value={paymentMethod} />

      <div className="flex gap-2">
        <select
          value={selectedVariantId}
          onChange={(e) => setSelectedVariantId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        >
          <option value="">Chọn sản phẩm...</option>
          {options.map((o) => (
            <option key={o.variantId} value={o.variantId} disabled={o.stock <= 0}>
              {o.label} — {formatVND(o.price)}/{o.unit} (còn {o.stock} {o.unit})
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
          const option = optionMap.get(item.variantId);
          if (!option) return null;
          return (
            <div key={item.variantId} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{option.label}</span>
              <input
                type="number"
                min={0.001}
                max={option.stock}
                step="any"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
              />
              <span className="w-10 text-xs text-gray-400">{option.unit}</span>
              <span className="w-24 text-right font-medium">
                {formatVND(option.price * item.quantity)}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.variantId)}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Hình thức thanh toán</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                paymentMethod === method
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 text-gray-700 hover:border-brand-600"
              }`}
            >
              {PAYMENT_METHOD_LABEL[method]}
            </button>
          ))}
        </div>
        {paymentMethod === "credit" && (
          <p className="mt-1 text-xs text-amber-600">
            Đơn sẽ ghi nhận là khách nợ (chưa thanh toán) — nên nhập tên và số điện thoại khách để
            theo dõi công nợ.
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
