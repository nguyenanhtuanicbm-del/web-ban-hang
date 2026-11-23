import { Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createWarehouse, renameWarehouse, setDefaultWarehouse, deleteWarehouse } from "./actions";

export const revalidate = 0;

export default async function WarehousesPage() {
  const supabase = await createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("*").order("name");
  const rows = warehouses ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Kho hàng</h1>

      <form action={createWarehouse} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Tên kho mới"
          className="max-w-sm flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Thêm kho
        </button>
      </form>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((w) => (
          <div key={w.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <form action={renameWarehouse} className="flex items-center gap-2">
              <input type="hidden" name="id" value={w.id} />
              <input
                name="name"
                defaultValue={w.name}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
              />
              <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                Lưu
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between">
              {w.is_default ? (
                <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  <Star className="h-3 w-3" /> Mặc định
                </span>
              ) : (
                <form action={setDefaultWarehouse}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="text-xs font-medium text-gray-500 hover:text-brand-600">
                    Đặt làm mặc định
                  </button>
                </form>
              )}
              {!w.is_default && (
                <form action={deleteWarehouse}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có kho nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Tên kho</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <form action={renameWarehouse} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={w.id} />
                    <input
                      name="name"
                      defaultValue={w.name}
                      className="rounded-md border border-gray-300 px-2 py-1 focus:border-brand-600 focus:outline-none"
                    />
                    <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                      Lưu
                    </button>
                    {w.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        <Star className="h-3 w-3" /> Mặc định
                      </span>
                    )}
                  </form>
                </td>
                <td className="px-4 py-2">
                  {!w.is_default && (
                    <form action={setDefaultWarehouse}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-gray-500 hover:text-brand-600"
                      >
                        Đặt làm mặc định
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {!w.is_default && (
                    <form action={deleteWarehouse}>
                      <input type="hidden" name="id" value={w.id} />
                      <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Chưa có kho nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
