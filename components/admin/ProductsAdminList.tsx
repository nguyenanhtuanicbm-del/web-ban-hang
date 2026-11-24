"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Tag, Trash2 } from "lucide-react";
import type { PriceAdjustMode, Product } from "@/lib/types";
import { productMinPrice, productTotalStock, productUnit } from "@/lib/product-helpers";
import { formatVND } from "@/lib/format";
import ProductImage from "@/components/ProductImage";

const MODE_LABEL: Record<PriceAdjustMode, string> = {
  percent_increase: "Tăng theo %",
  percent_decrease: "Giảm theo %",
  amount_increase: "Tăng số tiền cố định",
  amount_decrease: "Giảm số tiền cố định",
  set: "Đặt giá cố định",
};

export default function ProductsAdminList({
  products,
  deleteProduct,
  deleteProducts,
  bulkUpdatePrices,
}: {
  products: Product[];
  deleteProduct: (formData: FormData) => void | Promise<void>;
  deleteProducts: (formData: FormData) => void | Promise<void>;
  bulkUpdatePrices: (formData: FormData) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [mode, setMode] = useState<PriceAdjustMode>("percent_increase");
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Bạn có chắc muốn xóa ${selected.size} sản phẩm đã chọn? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }
    const formData = new FormData();
    selected.forEach((id) => formData.append("product_ids", id));
    startTransition(async () => {
      await deleteProducts(formData);
      setSelected(new Set());
    });
  }

  function handleApplyPrice() {
    const numValue = Number(value);
    if (!Number.isFinite(numValue) || numValue < 0) {
      alert("Vui lòng nhập giá trị hợp lệ.");
      return;
    }
    if (!confirm(`Áp dụng thay đổi giá cho ${selected.size} sản phẩm đã chọn?`)) return;

    const formData = new FormData();
    selected.forEach((id) => formData.append("product_ids", id));
    formData.set("mode", mode);
    formData.set("value", value);
    startTransition(async () => {
      await bulkUpdatePrices(formData);
      setSelected(new Set());
      setPriceModalOpen(false);
      setValue("");
    });
  }

  const valueLabel = useMemo(() => {
    if (mode === "set") return "Giá mới (đ)";
    if (mode.startsWith("percent")) return "Phần trăm (%)";
    return "Số tiền (đ)";
  }, [mode]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300"
        />
        Chọn tất cả ({products.length})
      </label>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
          <span className="text-sm font-medium text-brand-800">Đã chọn {selected.size} sản phẩm</span>
          <button
            type="button"
            onClick={() => setPriceModalOpen((v) => !v)}
            className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-100"
          >
            Sửa giá hàng loạt
          </button>
          <Link
            href={`/admin/san-pham/in-tem?ids=${[...selected].join(",")}`}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
          >
            <Tag className="h-4 w-4" />
            In tem
          </Link>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Xóa đã chọn
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:underline"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {priceModalOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-900">
            Sửa giá hàng loạt cho {selected.size} sản phẩm
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kiểu điều chỉnh</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PriceAdjustMode)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              >
                {(Object.keys(MODE_LABEL) as PriceAdjustMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{valueLabel}</label>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPrice}
              disabled={isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? "Đang áp dụng..." : "Áp dụng"}
            </button>
            <button
              type="button"
              onClick={() => setPriceModalOpen(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Hủy
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Áp dụng cho giá bán lẻ (bảng giá mặc định) của tất cả biến thể đang bán trong các sản
            phẩm đã chọn.
          </p>
        </div>
      )}

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {products.map((product) => (
          <div key={product.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggle(product.id)}
                className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300"
              />
              <ProductImage
                src={product.images?.[0]}
                alt={product.name}
                className="h-14 w-14 flex-shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.is_active ? "Đang bán" : "Đã ẩn"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {product.category?.name ?? "—"} · {product.variants?.length ?? 0} biến thể
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-900">
                  {(product.variants?.length ?? 0) > 1 ? "Từ " : ""}
                  {formatVND(productMinPrice(product))}
                </span>
                <span className="ml-2 text-gray-500">
                  Tồn: {productTotalStock(product)} {productUnit(product)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/san-pham/${product.id}`}
                  className="text-gray-500 hover:text-brand-600"
                  aria-label="Sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={product.id} />
                  <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có sản phẩm nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Tên sản phẩm</th>
              <th className="px-4 py-2">Danh mục</th>
              <th className="px-4 py-2">Biến thể</th>
              <th className="px-4 py-2 text-right">Giá</th>
              <th className="px-4 py-2 text-right">Tồn kho</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggle(product.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-2">
                  <ProductImage
                    src={product.images?.[0]}
                    alt={product.name}
                    className="h-10 w-10 rounded-md"
                  />
                </td>
                <td className="px-4 py-2 font-medium text-gray-900">{product.name}</td>
                <td className="px-4 py-2 text-gray-500">{product.category?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{product.variants?.length ?? 0}</td>
                <td className="px-4 py-2 text-right">
                  {(product.variants?.length ?? 0) > 1 ? "Từ " : ""}
                  {formatVND(productMinPrice(product))}
                </td>
                <td className="px-4 py-2 text-right">
                  {productTotalStock(product)} {productUnit(product)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.is_active ? "Đang bán" : "Đã ẩn"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/san-pham/${product.id}`}
                      className="text-gray-500 hover:text-brand-600"
                      aria-label="Sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
