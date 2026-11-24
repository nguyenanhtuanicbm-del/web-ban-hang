"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { formatVND } from "@/lib/format";
import Barcode from "./Barcode";

export interface LabelItem {
  key: string;
  productName: string;
  attrLabel: string;
  sku: string;
  price: number;
  unit: string;
}

export default function LabelPrintView({ items }: { items: LabelItem[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.key, 1]))
  );

  const labelsToPrint = items.flatMap((item) => {
    const qty = Math.max(0, Math.floor(quantities[item.key] ?? 0));
    return Array.from({ length: qty }, (_, i) => ({ ...item, copyKey: `${item.key}-${i}` }));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-bold text-gray-900">In tem sản phẩm</h1>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={labelsToPrint.length === 0}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          In ({labelsToPrint.length} tem)
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Sản phẩm</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2 text-right">Giá</th>
              <th className="px-4 py-2 text-right">Số lượng tem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {item.productName}
                  {item.attrLabel ? ` (${item.attrLabel})` : ""}
                </td>
                <td className="px-4 py-2 text-gray-500">{item.sku}</td>
                <td className="px-4 py-2 text-right">
                  {formatVND(item.price)}/{item.unit}
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    value={quantities[item.key] ?? 0}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.key]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Không có sản phẩm nào được chọn.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="hidden print:grid print:grid-cols-3 print:gap-2">
        {labelsToPrint.map((label) => (
          <div
            key={label.copyKey}
            className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-2 text-center"
            style={{ breakInside: "avoid" }}
          >
            <p className="text-[11px] font-semibold leading-tight">{label.productName}</p>
            {label.attrLabel && <p className="text-[10px] text-gray-600">{label.attrLabel}</p>}
            <p className="text-sm font-bold">
              {formatVND(label.price)}/{label.unit}
            </p>
            <Barcode value={label.sku} height={30} />
          </div>
        ))}
      </div>
    </div>
  );
}
