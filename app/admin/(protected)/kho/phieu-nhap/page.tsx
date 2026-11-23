import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  received: "Đã nhận hàng",
  cancelled: "Đã hủy",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("*, supplier:suppliers(name), warehouse:warehouses(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Phiếu nhập hàng</h1>
        <Link
          href="/admin/kho/phieu-nhap/moi"
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Tạo phiếu nhập
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Mã phiếu</th>
              <th className="px-4 py-2">Nhà cung cấp</th>
              <th className="px-4 py-2">Kho nhập</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2 text-right">Tổng tiền</th>
              <th className="px-4 py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((po) => (
              <tr key={po.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/kho/phieu-nhap/${po.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {po.code}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{po.supplier?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-700">{po.warehouse?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[po.status]}`}
                  >
                    {STATUS_LABEL[po.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">{formatVND(po.total_amount)}</td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(po.created_at).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Chưa có phiếu nhập nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
