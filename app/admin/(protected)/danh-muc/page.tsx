import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCategory, updateCategory, deleteCategory } from "./actions";

export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Danh mục</h1>

      <form action={createCategory} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Tên danh mục mới"
          className="max-w-sm flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Thêm danh mục
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Tên danh mục</th>
              <th className="px-4 py-2">Đường dẫn</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((category) => (
              <tr key={category.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <form action={updateCategory} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={category.id} />
                    <input
                      name="name"
                      defaultValue={category.name}
                      className="rounded-md border border-gray-300 px-2 py-1 focus:border-brand-600 focus:outline-none"
                    />
                    <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                      Lưu
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-gray-500">/{category.slug}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(categories ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Chưa có danh mục nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
