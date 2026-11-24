"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export interface StockCountItemInput {
  variantId: string;
  label: string;
  sku: string;
  unit: string;
  systemQuantity: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Đang lưu..." : "Tạo phiếu kiểm kho"}
    </button>
  );
}

export default function StockCountForm({
  warehouseId,
  items,
  action,
}: {
  warehouseId: string;
  items: StockCountItemInput[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [counted, setCounted] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.variantId, i.systemQuantity]))
  );

  const payload = items.map((i) => ({
    variantId: i.variantId,
    systemQuantity: i.systemQuantity,
    countedQuantity: counted[i.variantId] ?? i.systemQuantity,
  }));

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="warehouse_id" value={warehouseId} />
      <input type="hidden" name="items_json" value={JSON.stringify(payload)} />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2">Sản phẩm</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">ĐVT</th>
              <th className="px-3 py-2 text-right">Tồn hệ thống</th>
              <th className="px-3 py-2 text-right">Tồn thực tế</th>
              <th className="px-3 py-2 text-right">Lệch</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const value = counted[item.variantId] ?? item.systemQuantity;
              const diff = value - item.systemQuantity;
              return (
                <tr key={item.variantId} className="border-t border-gray-100">
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2 text-gray-500">{item.sku}</td>
                  <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{item.systemQuantity}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={value}
                      onChange={(e) =>
                        setCounted((prev) => ({ ...prev, [item.variantId]: Number(e.target.value) }))
                      }
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
                    />
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      diff === 0 ? "text-gray-400" : diff > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SubmitButton />
    </form>
  );
}
