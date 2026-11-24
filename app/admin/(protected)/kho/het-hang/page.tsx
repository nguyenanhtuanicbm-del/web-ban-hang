import Link from "next/link";
import { PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

interface OutOfStockRow {
  variant_id: string;
  product_id: string;
  sku: string;
  low_stock_threshold: number;
  total_quantity: number;
  product: { name: string; category: { id: string; name: string } | null } | null;
}

export default async function OutOfStockPage({
  searchParams,
}: {
  searchParams: Promise<{ danh_muc?: string; q?: string }>;
}) {
  const { danh_muc: categoryId, q } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase
      .from("low_stock_variants")
      .select("*, product:products(name, category:categories(id, name))")
      .eq("total_quantity", 0),
    supabase.from("categories").select("*").order("name"),
  ]);

  let filtered = (rows ?? []) as unknown as OutOfStockRow[];
  if (categoryId) {
    filtered = filtered.filter((r) => r.product?.category?.id === categoryId);
  }
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.product?.name ?? "").toLowerCase().includes(needle) || r.sku.toLowerCase().includes(needle)
    );
  }
  filtered = [...filtered].sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sản phẩm hết hàng</h1>
        <p className="text-sm text-gray-500">
          Các biến thể đang bán nhưng tồn kho hiện tại bằng 0 — cần nhập thêm hàng sớm.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="danh_muc"
          defaultValue={categoryId ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        >
          <option value="">Tất cả danh mục</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        {(categoryId || q) && (
          <Link
            href="/admin/kho/het-hang"
            className="flex items-center text-sm text-gray-500 hover:underline"
          >
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map((r) => (
          <Link
            key={r.variant_id}
            href={`/admin/san-pham/${r.product_id}`}
            className="block rounded-lg border border-gray-200 bg-white p-3"
          >
            <p className="font-medium text-gray-900">{r.product?.name ?? "Sản phẩm"}</p>
            <p className="text-xs text-gray-400">
              {r.sku} · {r.product?.category?.name ?? "—"}
            </p>
            <p className="mt-1 text-xs font-medium text-red-600">
              Hết hàng · Ngưỡng cảnh báo: {r.low_stock_threshold}
            </p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 py-10 text-center text-gray-400">
            <PackageX className="h-8 w-8" />
            <p>Không có sản phẩm nào hết hàng.</p>
          </div>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Sản phẩm</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Danh mục</th>
              <th className="px-4 py-2 text-right">Ngưỡng cảnh báo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.variant_id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-900">{r.product?.name ?? "Sản phẩm"}</td>
                <td className="px-4 py-2 text-gray-500">{r.sku}</td>
                <td className="px-4 py-2 text-gray-500">{r.product?.category?.name ?? "—"}</td>
                <td className="px-4 py-2 text-right text-amber-600">{r.low_stock_threshold}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/san-pham/${r.product_id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Sửa / Nhập hàng
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <PackageX className="h-8 w-8" />
                    <p>Không có sản phẩm nào hết hàng.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
