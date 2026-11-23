import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function StockTransfersPage() {
  const supabase = await createClient();
  const { data: transfers } = await supabase
    .from("stock_transfers")
    .select("*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Điều chuyển kho</h1>
        <Link
          href="/admin/kho/dieu-chuyen/moi"
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Tạo phiếu điều chuyển
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Mã phiếu</th>
              <th className="px-4 py-2">Từ kho</th>
              <th className="px-4 py-2">Đến kho</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {(transfers ?? []).map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/kho/dieu-chuyen/${t.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {t.code}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{t.from_warehouse?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-700">{t.to_warehouse?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.status === "completed" ? "Đã hoàn tất" : "Nháp"}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(t.created_at).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {(transfers ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Chưa có phiếu điều chuyển nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
