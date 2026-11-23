import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";

export const revalidate = 0;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (q?.trim()) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: customers } = await query;
  const rows = customers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Khách hàng</h1>

      <form
        action={createCustomer}
        className="grid max-w-3xl grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <input
          name="name"
          required
          placeholder="Tên khách hàng *"
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
          Thêm khách hàng
        </button>
      </form>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          className="max-w-sm flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <form action={updateCustomer} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={c.id} />
              <div>
                <label className="text-xs text-gray-400">Tên</label>
                <input
                  name="name"
                  defaultValue={c.name}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Điện thoại</label>
                <input
                  name="phone"
                  defaultValue={c.phone ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Địa chỉ</label>
                <input
                  name="address"
                  defaultValue={c.address ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Ghi chú</label>
                <input
                  name="note"
                  defaultValue={c.note ?? ""}
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
            <form action={deleteCustomer} className="mt-2 flex justify-end border-t border-gray-100 pt-2">
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Xóa khách hàng
              </button>
            </form>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có khách hàng nào.
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
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="p-0" colSpan={4}>
                  <form action={updateCustomer} className="grid grid-cols-4 items-center gap-2 px-4 py-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <input
                      name="phone"
                      defaultValue={c.phone ?? ""}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <input
                      name="address"
                      defaultValue={c.address ?? ""}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        name="note"
                        defaultValue={c.note ?? ""}
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                        Lưu
                      </button>
                    </div>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={c.id} />
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
                  Chưa có khách hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
