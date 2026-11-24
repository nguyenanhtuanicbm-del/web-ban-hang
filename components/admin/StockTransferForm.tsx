"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Warehouse } from "@/lib/types";

interface VariantOption {
  variantId: string;
  label: string;
  sku: string;
  unit: string;
}

interface StockEntry {
  variantId: string;
  warehouseId: string;
  quantity: number;
}

interface TransferLineItem {
  variantId: string;
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
      {pending ? "Đang lưu..." : "Tạo phiếu điều chuyển"}
    </button>
  );
}

export default function StockTransferForm({
  variants,
  warehouses,
  stock,
  action,
}: {
  variants: VariantOption[];
  warehouses: Warehouse[];
  stock: StockEntry[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? warehouses[0]?.id ?? "");
  const [items, setItems] = useState<TransferLineItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stock) map.set(`${s.variantId}:${s.warehouseId}`, s.quantity);
    return map;
  }, [stock]);

  function stockAt(variantId: string, warehouseId: string) {
    return stockMap.get(`${variantId}:${warehouseId}`) ?? 0;
  }

  const variantMap = useMemo(() => new Map(variants.map((v) => [v.variantId, v])), [variants]);

  function addItem() {
    if (!selectedVariantId) return;
    setItems((prev) => {
      if (prev.some((i) => i.variantId === selectedVariantId)) return prev;
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

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Từ kho *</label>
          <select
            name="from_warehouse_id"
            required
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Đến kho *</label>
          <select
            name="to_warehouse_id"
            required
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
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

      {fromWarehouseId === toWarehouseId && (
        <p className="text-sm text-red-600">Kho nguồn và kho đích phải khác nhau.</p>
      )}

      <div className="flex gap-2">
        <select
          value={selectedVariantId}
          onChange={(e) => setSelectedVariantId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        >
          <option value="">Chọn sản phẩm...</option>
          {variants.map((v) => (
            <option key={v.variantId} value={v.variantId}>
              {v.label} (còn {stockAt(v.variantId, fromWarehouseId)} tại kho nguồn)
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
              <th className="px-3 py-2">ĐVT</th>
              <th className="px-3 py-2 text-right">Tồn tại kho nguồn</th>
              <th className="px-3 py-2 text-right">SL chuyển</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const variant = variantMap.get(item.variantId);
              const available = stockAt(item.variantId, fromWarehouseId);
              return (
                <tr key={item.variantId} className="border-t border-gray-100">
                  <td className="px-3 py-2">{variant?.label}</td>
                  <td className="px-3 py-2 text-gray-500">{variant?.unit}</td>
                  <td className="px-3 py-2 text-right">{available}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0.001}
                      max={available}
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
                    />
                  </td>
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
