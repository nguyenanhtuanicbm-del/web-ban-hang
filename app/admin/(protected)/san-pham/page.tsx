import Link from "next/link";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { getAllProductsForAdmin } from "@/lib/queries";
import { productMinPrice, productTotalStock } from "@/lib/product-helpers";
import { formatVND } from "@/lib/format";
import ProductImage from "@/components/ProductImage";
import { deleteProduct } from "./actions";

export const revalidate = 0;

export default async function AdminProductsPage() {
  const products = await getAllProductsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">Sản phẩm</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/san-pham/nhap-excel"
            className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Nhập từ Excel
          </Link>
          <Link
            href="/admin/san-pham/moi"
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {products.map((product) => (
          <div key={product.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-3">
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
                <span className="ml-2 text-gray-500">Tồn: {productTotalStock(product)}</span>
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
                <td className="px-4 py-2 text-right">{productTotalStock(product)}</td>
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
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
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
