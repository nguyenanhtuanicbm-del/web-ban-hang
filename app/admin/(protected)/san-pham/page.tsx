import Link from "next/link";
import { Plus, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllProductsForAdmin } from "@/lib/queries";
import ProductsAdminList from "@/components/admin/ProductsAdminList";
import { bulkUpdatePrices, deleteProduct, deleteProducts } from "./actions";

export const revalidate = 0;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ danh_muc?: string }>;
}) {
  const { danh_muc: categoryId } = await searchParams;
  const supabase = await createClient();

  const [allProducts, { data: categories }] = await Promise.all([
    getAllProductsForAdmin(),
    supabase.from("categories").select("*").order("name"),
  ]);

  const products = categoryId ? allProducts.filter((p) => p.category_id === categoryId) : allProducts;

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

      <form method="get" className="flex flex-wrap items-center gap-2">
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
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Lọc
        </button>
        {categoryId && (
          <Link href="/admin/san-pham" className="text-sm text-gray-500 hover:underline">
            Xóa lọc
          </Link>
        )}
      </form>

      <ProductsAdminList
        products={products}
        deleteProduct={deleteProduct}
        deleteProducts={deleteProducts}
        bulkUpdatePrices={bulkUpdatePrices}
      />
    </div>
  );
}
