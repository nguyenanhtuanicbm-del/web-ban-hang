import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

export const revalidate = 0;

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("name");
  const rows = suppliers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Nhà cung cấp</h1>

      <form
        action={createSupplier}
        className="grid max-w-3xl grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <input
          name="name"
          required
          placeholder="Tên nhà cung cấp *"
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <input
          name="phone"
          placeholder="Số điện thoại"
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <input
          name="address"
          placeholder="Địa chỉ"
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none sm:col-span-2"
        />
        <input
          name="note"
          placeholder="Ghi chú"
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none sm:col-span-2"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 sm:col-span-2"
        >
          Thêm nhà cung cấp
        </button>
      </form>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((s) => (
          <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <form action={updateSupplier} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={s.id} />
              <div>
                <label className="text-xs text-gray-400">Tên</label>
                <input
                  name="name"
                  defaultValue={s.name}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Điện thoại</label>
                <input
                  name="phone"
                  defaultValue={s.phone ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Địa chỉ</label>
                <input
                  name="address"
                  defaultValue={s.address ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Ghi chú</label>
                <input
                  name="note"
                  defaultValue={s.note ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-fit text-xs font-medium text-brand-600 hover:underline"
              >
                Lưu
              </button>
            </form>
            <form action={deleteSupplier} className="mt-2 flex justify-end border-t border-gray-100 pt-2">
              <input type="hidden" name="id" value={s.id} />
              <button
                type="submit"
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Xóa nhà cung cấp
              </button>
            </form>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có nhà cung cấp nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Tên</th>
              <th className="px-4 py-2">Điện thoại</th>
              <th className="px-4 py-2">Địa chỉ</th>
              <th className="px-4 py-2">Ghi chú</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="p-0" colSpan={4}>
                  <form
                    action={updateSupplier}
                    className="grid grid-cols-4 items-center gap-2 px-4 py-2"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="name"
                      defaultValue={s.name}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <input
                      name="phone"
                      defaultValue={s.phone ?? ""}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <input
                      name="address"
                      defaultValue={s.address ?? ""}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        name="note"
                        defaultValue={s.note ?? ""}
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                        Lưu
                      </button>
                    </div>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteSupplier}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-red-500 hover:text-red-700" aria-label="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Chưa có nhà cung cấp nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
