"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatVND } from "@/lib/format";
import { formatVariantAttributes, type Product, type Supplier, type Warehouse } from "@/lib/types";

interface LineItem {
  variantId: string;
  quantity: number;
  unitCost: number;
  lotCode: string;
  expiryDate: string;
}

interface FlatVariantOption {
  variantId: string;
  label: string;
  sku: string;
  costPrice: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Đang lưu..." : "Tạo phiếu nhập"}
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
        costPrice: variant.cost_price,
      });
    }
  }
  return options;
}

export default function PurchaseOrderForm({
  products,
  suppliers,
  warehouses,
  defaultWarehouseId,
  action,
}: {
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  defaultWarehouseId: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const options = useMemo(() => flattenOptions(products), [products]);
  const optionMap = useMemo(() => new Map(options.map((o) => [o.variantId, o])), [options]);

  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [otherCost, setOtherCost] = useState("0");

  function addItem() {
    if (!selectedVariantId) return;
    const option = optionMap.get(selectedVariantId);
    setItems((prev) => {
      if (prev.some((i) => i.variantId === selectedVariantId)) return prev;
      return [
        ...prev,
        {
          variantId: selectedVariantId,
          quantity: 1,
          unitCost: option?.costPrice ?? 0,
          lotCode: "",
          expiryDate: "",
        },
      ];
    });
    setSelectedVariantId("");
  }

  function updateItem(variantId: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, ...patch } : i)));
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const total = subtotal + (Number(otherCost) || 0);

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nhà cung cấp</label>
          <select
            name="supplier_id"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          >
            <option value="">Không có</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nhập vào kho *</label>
          <select
            name="warehouse_id"
            required
            defaultValue={defaultWarehouseId ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={selectedVariantId}
          onChange={(e) => setSelectedVariantId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        >
          <option value="">Chọn sản phẩm...</option>
          {options.map((o) => (
            <option key={o.variantId} value={o.variantId}>
              {o.label} (SKU: {o.sku})
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

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2">Sản phẩm</th>
              <th className="px-3 py-2">SL</th>
              <th className="px-3 py-2">Giá nhập</th>
              <th className="px-3 py-2">Lô (tuỳ chọn)</th>
              <th className="px-3 py-2">HSD (tuỳ chọn)</th>
              <th className="px-3 py-2">Thành tiền</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const option = optionMap.get(item.variantId);
              return (
                <tr key={item.variantId} className="border-t border-gray-100">
                  <td className="px-3 py-2">{option?.label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.variantId, { quantity: Number(e.target.value) })}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.variantId, { unitCost: Number(e.target.value) })}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.lotCode}
                      onChange={(e) => updateItem(item.variantId, { lotCode: e.target.value })}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateItem(item.variantId, { expiryDate: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{formatVND(item.quantity * item.unitCost)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <label className="text-sm font-medium text-gray-700">
          Chi phí nhập hàng khác (ship, thuế...)
        </label>
        <input
          name="other_cost"
          type="number"
          min={0}
          value={otherCost}
          onChange={(e) => setOtherCost(e.target.value)}
          className="w-32 rounded-md border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="flex flex-col items-end gap-1 text-sm">
        <span>Tạm tính: {formatVND(subtotal)}</span>
        <span className="text-base font-semibold text-brand-600">Tổng cộng: {formatVND(total)}</span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Ghi chú</label>
        <textarea
          name="note"
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
