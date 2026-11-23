import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultPriceListId } from "@/lib/stock";
import { formatVND } from "@/lib/format";
import {
  filterStockValueRows,
  getStockValueRows,
  sortStockValueRowsByValueDesc,
  stockValueTotals,
} from "@/lib/inventory-value";

export const revalidate = 0;

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-brand-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

export default async function StockValuePage({
  searchParams,
}: {
  searchParams: Promise<{ kho?: string; q?: string }>;
}) {
  const { kho: warehouseId, q } = await searchParams;
  const supabase = await createClient();

  const [{ data: warehouses }, defaultPriceListId] = await Promise.all([
    supabase.from("warehouses").select("*").order("name"),
    getDefaultPriceListId(supabase),
  ]);

  const allRows = await getStockValueRows(supabase, { warehouseId, defaultPriceListId });
  const filtered = sortStockValueRowsByValueDesc(filterStockValueRows(allRows, q));
  const totals = stockValueTotals(filtered);

  const exportParams = new URLSearchParams();
  if (warehouseId) exportParams.set("kho", warehouseId);
  if (q) exportParams.set("q", q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Giá trị tồn kho</h1>
        <a
          href={`/admin/kho/gia-tri-ton-kho/xuat?${exportParams.toString()}`}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          <Download className="h-4 w-4" />
          Xuất Excel
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Số SKU còn hàng" value={String(totals.skuCount)} />
        <StatCard label="Tổng số lượng tồn" value={totals.quantity.toLocaleString("vi-VN")} />
        <StatCard
          label="Giá trị tồn kho (giá vốn)"
          value={formatVND(totals.costValue)}
          highlight
        />
        <StatCard label="Giá trị theo giá bán" value={formatVND(totals.retailValue)} />
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="kho"
          defaultValue={warehouseId ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        >
          <option value="">Tất cả kho</option>
          {(warehouses ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên hoặc SKU..."
          className="max-w-xs flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Lọc
        </button>
      </form>

      {/* Điện thoại: dạng thẻ — bảng 8 cột quá chật, cuộn ngang khó đọc nên tách riêng. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map((r) => (
          <div key={r.variantId} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <div className="font-medium text-gray-900">
              {r.productName}
              {r.attrLabel ? ` (${r.attrLabel})` : ""}
              {!r.isActive && <span className="ml-2 text-xs text-gray-400">(đã ẩn)</span>}
            </div>
            <div className="text-xs text-gray-400">
              {r.sku} · {r.categoryName ?? "—"}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-gray-500">Tồn kho</span>
              <span
                className={`text-right ${
                  r.quantity <= r.lowStockThreshold ? "font-medium text-amber-600" : ""
                }`}
              >
                {r.quantity}
              </span>
              <span className="text-gray-500">Giá vốn</span>
              <span className="text-right">{formatVND(r.costPrice)}</span>
              <span className="text-gray-500">Giá trị vốn</span>
              <span className="text-right font-medium">{formatVND(r.quantity * r.costPrice)}</span>
              <span className="text-gray-500">Giá bán</span>
              <span className="text-right">{formatVND(r.price)}</span>
              <span className="text-gray-500">Giá trị bán</span>
              <span className="text-right">{formatVND(r.quantity * r.price)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Không có sản phẩm nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ như cũ. */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Sản phẩm</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Danh mục</th>
              <th className="px-4 py-2 text-right">Tồn kho</th>
              <th className="px-4 py-2 text-right">Giá vốn</th>
              <th className="px-4 py-2 text-right">Giá trị vốn</th>
              <th className="px-4 py-2 text-right">Giá bán</th>
              <th className="px-4 py-2 text-right">Giá trị bán</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.variantId} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {r.productName}
                  {r.attrLabel ? ` (${r.attrLabel})` : ""}
                  {!r.isActive && <span className="ml-2 text-xs text-gray-400">(đã ẩn)</span>}
                </td>
                <td className="px-4 py-2 text-gray-500">{r.sku}</td>
                <td className="px-4 py-2 text-gray-500">{r.categoryName ?? "—"}</td>
                <td
                  className={`px-4 py-2 text-right ${
                    r.quantity <= r.lowStockThreshold ? "font-medium text-amber-600" : ""
                  }`}
                >
                  {r.quantity}
                </td>
                <td className="px-4 py-2 text-right">{formatVND(r.costPrice)}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {formatVND(r.quantity * r.costPrice)}
                </td>
                <td className="px-4 py-2 text-right">{formatVND(r.price)}</td>
                <td className="px-4 py-2 text-right">{formatVND(r.quantity * r.price)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
