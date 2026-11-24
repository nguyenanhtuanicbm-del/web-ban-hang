"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { formatVND } from "@/lib/format";
import { formatVariantAttributes, PAYMENT_METHOD_LABEL, type PaymentMethod, type Product } from "@/lib/types";

interface LineItem {
  variantId: string;
  quantity: number;
}

interface FlatVariantOption {
  variantId: string;
  label: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  unit: string;
}

const MAX_SUGGESTIONS = 8;

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
        sku: variant.sku,
        barcode: variant.barcode,
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
  const optionMap = useMemo(() => new Map(options.map((o) => [o.variantId, o])), [options]);

  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.sku.toLowerCase().includes(q) ||
          (o.barcode ? o.barcode.toLowerCase().includes(q) : false)
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [options, query]);

  function addItem(variantId: string) {
    const option = optionMap.get(variantId);
    if (!option || option.stock <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity: Math.min(i.quantity + 1, option.stock) } : i
        );
      }
      return [...prev, { variantId, quantity: 1 }];
    });
    setQuery("");
    setOpen(false);
    searchRef.current?.focus();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const exact = options.find(
      (o) => o.sku.toLowerCase() === q || (o.barcode ? o.barcode.toLowerCase() === q : false)
    );
    if (exact) {
      addItem(exact.variantId);
      return;
    }
    if (filtered.length === 1) {
      addItem(filtered[0].variantId);
    }
  }

  function updateQuantity(variantId: string, quantity: number) {
    const max = optionMap.get(variantId)?.stock ?? Infinity;
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(Math.max(0.001, quantity), max) } : i
      )
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

      <div ref={containerRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Gõ tên sản phẩm, SKU hoặc quét mã vạch..."
          autoFocus
          className="w-full rounded-md border border-gray-300 py-3 pl-9 pr-3 text-base focus:border-brand-600 focus:outline-none"
        />

        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Không tìm thấy sản phẩm phù hợp.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.variantId}
                  type="button"
                  disabled={o.stock <= 0}
                  onClick={() => addItem(o.variantId)}
                  className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-2 text-left first:border-t-0 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{o.label}</p>
                    <p className="text-xs text-gray-400">SKU: {o.sku}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-medium text-brand-600">
                      {formatVND(o.price)}/{o.unit}
                    </p>
                    <p className="text-xs text-gray-400">
                      {o.stock <= 0 ? "Hết hàng" : `Còn ${o.stock} ${o.unit}`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">
            Chưa có sản phẩm nào — tìm và chọn sản phẩm ở ô phía trên.
          </p>
        )}
        {items.map((item) => {
          const option = optionMap.get(item.variantId);
          if (!option) return null;
          return (
            <div
              key={item.variantId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-2 text-sm"
            >
              <div className="min-w-[140px] flex-1">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-400">
                  {formatVND(option.price)}/{option.unit}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Giảm số lượng"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0.001}
                  max={option.stock}
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-center"
                />
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Tăng số lượng"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="ml-1 w-8 flex-shrink-0 text-xs text-gray-400">{option.unit}</span>
              </div>
              <div className="w-24 flex-shrink-0 text-right font-semibold text-gray-900">
                {formatVND(option.price * item.quantity)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.variantId)}
                className="flex-shrink-0 text-red-500 hover:text-red-700"
                aria-label="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="font-semibold text-gray-900">Tổng cộng</span>
            <span className="text-xl font-bold text-brand-600">{formatVND(total)}</span>
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
