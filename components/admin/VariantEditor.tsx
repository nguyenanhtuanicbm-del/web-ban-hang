"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { UNIT_OPTIONS, Variant } from "@/lib/types";
import { slugify } from "@/lib/format";

interface AttributeRow {
  name: string;
  valuesCsv: string;
}

interface VariantRow {
  key: string;
  /** null = biến thể mới chưa lưu, có giá trị = id biến thể đã tồn tại trong DB. */
  dbId: string | null;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  lowStockThreshold: string;
  unit: string;
  initialStock: string;
  currentStock: number | null;
  isActive: boolean;
}

function attributesToRows(variants: Variant[]): {
  attributeRows: AttributeRow[];
  variantRows: VariantRow[];
} {
  const attrValues = new Map<string, Set<string>>();
  for (const v of variants) {
    for (const [key, value] of Object.entries(v.attributes)) {
      if (!attrValues.has(key)) attrValues.set(key, new Set());
      attrValues.get(key)!.add(value);
    }
  }

  const attributeRows: AttributeRow[] = Array.from(attrValues.entries()).map(([name, values]) => ({
    name,
    valuesCsv: Array.from(values).join(", "),
  }));

  const variantRows: VariantRow[] = variants.map((v) => ({
    key: v.id,
    dbId: v.id,
    attributes: v.attributes,
    sku: v.sku,
    barcode: v.barcode ?? "",
    price: String(v.price ?? 0),
    costPrice: String(v.cost_price ?? 0),
    lowStockThreshold: String(v.low_stock_threshold ?? 5),
    unit: v.unit || "Cái",
    initialStock: "0",
    currentStock: v.total_stock ?? 0,
    isActive: v.is_active,
  }));

  return { attributeRows, variantRows };
}

function cartesianProduct(attributeRows: AttributeRow[]): Record<string, string>[] {
  const parsed = attributeRows
    .map((a) => ({
      name: a.name.trim(),
      values: a.valuesCsv
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((a) => a.name && a.values.length > 0);

  if (parsed.length === 0) return [{}];

  let combos: Record<string, string>[] = [{}];
  for (const attr of parsed) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of attr.values) {
        next.push({ ...combo, [attr.name]: value });
      }
    }
    combos = next;
  }
  return combos;
}

function attributesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

function suggestSku(attributes: Record<string, string>): string {
  const parts = Object.values(attributes).map((v) => slugify(v).toUpperCase());
  return parts.length > 0
    ? parts.join("-")
    : `SP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function emptyRow(): VariantRow {
  return {
    key: `new-${Date.now()}-${Math.random()}`,
    dbId: null,
    attributes: {},
    sku: suggestSku({}),
    barcode: "",
    price: "",
    costPrice: "0",
    lowStockThreshold: "5",
    unit: "Cái",
    initialStock: "0",
    currentStock: null,
    isActive: true,
  };
}

export default function VariantEditor({
  initialVariants,
  onAdjustStock,
}: {
  initialVariants: Variant[];
  /** Chỉ truyền ở trang sửa sản phẩm — cho phép điều chỉnh nhanh tồn kho ngay tại đây. */
  onAdjustStock?: (formData: FormData) => Promise<{ ok: boolean; quantity?: number; error?: string }>;
}) {
  const initial = attributesToRows(initialVariants);
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>(initial.attributeRows);
  const [variantRows, setVariantRows] = useState<VariantRow[]>(
    initial.variantRows.length > 0 ? initial.variantRows : [emptyRow()]
  );
  const [adjustingKey, setAdjustingKey] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState("");
  const [isSavingStock, startSavingStock] = useTransition();

  function applyAttributes() {
    const combos = cartesianProduct(attributeRows);
    setVariantRows((prev) => {
      const next = [...prev];
      for (const combo of combos) {
        const exists = next.some((r) => attributesEqual(r.attributes, combo));
        if (!exists) {
          next.push({ ...emptyRow(), attributes: combo, sku: suggestSku(combo) });
        }
      }
      return next;
    });
  }

  function updateRow(key: string, patch: Partial<VariantRow>) {
    setVariantRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setVariantRows((prev) => prev.filter((r) => r.key !== key));
  }

  function openStockEditor(row: VariantRow) {
    setAdjustingKey(row.key);
    setStockInput(String(row.currentStock ?? 0));
  }

  function saveStock(row: VariantRow) {
    if (!onAdjustStock || !row.dbId) return;
    const newQuantity = Number(stockInput);
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      alert("Vui lòng nhập số lượng hợp lệ.");
      return;
    }

    const formData = new FormData();
    formData.set("variant_id", row.dbId);
    formData.set("new_quantity", stockInput);

    startSavingStock(async () => {
      const result = await onAdjustStock(formData);
      if (result.ok) {
        updateRow(row.key, { currentStock: result.quantity ?? newQuantity });
        setAdjustingKey(null);
      } else {
        alert(result.error || "Không thể cập nhật tồn kho.");
      }
    });
  }

  const hasExisting = variantRows.some((r) => r.dbId);

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="variants_json" value={JSON.stringify(variantRows)} />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Thuộc tính (tuỳ chọn — ví dụ Size: S, M, L)
        </label>
        <div className="flex flex-col gap-2">
          {attributeRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Tên thuộc tính (VD: Size)"
                value={row.name}
                onChange={(e) =>
                  setAttributeRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r))
                  )
                }
                className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Giá trị, phân cách bằng dấu phẩy (VD: S, M, L)"
                value={row.valuesCsv}
                onChange={(e) =>
                  setAttributeRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, valuesCsv: e.target.value } : r))
                  )
                }
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setAttributeRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setAttributeRows((prev) => [...prev, { name: "", valuesCsv: "" }])}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            <Plus className="h-4 w-4" /> Thêm thuộc tính
          </button>
          <button
            type="button"
            onClick={applyAttributes}
            className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            Tạo biến thể từ thuộc tính
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2">Thuộc tính</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Mã vạch</th>
              <th className="px-3 py-2">Giá bán lẻ *</th>
              <th className="px-3 py-2">Giá vốn</th>
              <th className="px-3 py-2">Đơn vị tính</th>
              <th className="px-3 py-2">Ngưỡng cảnh báo</th>
              <th className="px-3 py-2">{hasExisting ? "Tồn hiện tại" : "Tồn ban đầu"}</th>
              <th className="px-3 py-2">Đang bán</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {variantRows.map((row) => (
              <tr key={row.key} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-600">
                  {Object.entries(row.attributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ") || "—"}
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.sku}
                    onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                    className="w-32 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.barcode}
                    onChange={(e) => updateRow(row.key, { barcode: e.target.value })}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    required
                    value={row.price}
                    onChange={(e) => updateRow(row.key, { price: e.target.value })}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.costPrice}
                    onChange={(e) => updateRow(row.key, { costPrice: e.target.value })}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.lowStockThreshold}
                    onChange={(e) => updateRow(row.key, { lowStockThreshold: e.target.value })}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  {row.dbId ? (
                    adjustingKey === row.key ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          autoFocus
                          value={stockInput}
                          onChange={(e) => setStockInput(e.target.value)}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => saveStock(row)}
                          disabled={isSavingStock}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                          aria-label="Lưu tồn kho"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustingKey(null)}
                          disabled={isSavingStock}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Hủy"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{row.currentStock ?? 0}</span>
                        {onAdjustStock && (
                          <button
                            type="button"
                            onClick={() => openStockEditor(row)}
                            className="text-gray-400 hover:text-brand-600"
                            aria-label="Điều chỉnh tồn kho"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.initialStock}
                      onChange={(e) => updateRow(row.key, { initialStock: e.target.value })}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1"
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => updateRow(row.key, { isActive: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  {!row.dbId && variantRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        {onAdjustStock
          ? "Bấm biểu tượng bút cạnh số tồn kho để điều chỉnh nhanh (vẫn ghi vào thẻ kho). Dùng \"Nhập hàng\", \"Kiểm kho\" hoặc \"Điều chuyển kho\" cho các thay đổi lớn/có nhiều sản phẩm."
          : "Sau khi tạo, tồn kho chỉ chỉnh được qua \"Nhập hàng\", \"Kiểm kho\" hoặc \"Điều chuyển kho\" để thẻ kho luôn chính xác."}
      </p>
    </div>
  );
}
