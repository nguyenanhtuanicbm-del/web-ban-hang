import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  completed: "Đã hoàn tất",
};

export default async function StockCountsPage() {
  const supabase = await createClient();
  const { data: counts } = await supabase
    .from("stock_counts")
    .select("*, warehouse:warehouses(name)")
    .order("created_at", { ascending: false });

  const rows = counts ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">Kiểm kho</h1>
        <Link
          href="/admin/kho/kiem-ke/moi"
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Tạo phiếu kiểm kho
        </Link>
      </div>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/admin/kho/kiem-ke/${c.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
          >
            <div>
              <p className="font-medium text-brand-600">{c.code}</p>
              <p className="text-sm text-gray-700">{c.warehouse?.name ?? "—"}</p>
              <p className="text-xs text-gray-400">
                {new Date(c.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                c.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {STATUS_LABEL[c.status]}
            </span>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có phiếu kiểm kho nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Mã phiếu</th>
              <th className="px-4 py-2">Kho</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/kho/kiem-ke/${c.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{c.warehouse?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(c.created_at).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Chưa có phiếu kiểm kho nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
