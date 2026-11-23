import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order } from "@/lib/types";

export const revalidate = 0;

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (orders as Order[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Đơn hàng</h1>

      {/* Điện thoại: dạng thẻ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((order) => (
          <Link
            key={order.id}
            href={`/admin/don-hang/${order.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-brand-600">{order.code}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-700">{order.customer_name}</div>
            <div className="text-xs text-gray-400">{order.phone}</div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {order.source === "in_store" ? "Tại cửa hàng" : "Online"} ·{" "}
                {new Date(order.created_at).toLocaleDateString("vi-VN")}
              </span>
              <span className="text-right font-medium text-gray-900">
                {formatVND(order.total)}
                {order.paid_amount < order.total && (
                  <span className="ml-1 font-medium text-amber-600">
                    (Nợ {formatVND(order.total - order.paid_amount)})
                  </span>
                )}
              </span>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có đơn hàng nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Mã đơn</th>
              <th className="px-4 py-2">Khách hàng</th>
              <th className="px-4 py-2">Nguồn</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2 text-right">Tổng tiền</th>
              <th className="px-4 py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/don-hang/${order.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {order.code}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <div>{order.customer_name}</div>
                  <div className="text-xs text-gray-400">{order.phone}</div>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {order.source === "in_store" ? "Tại cửa hàng" : "Online"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                  >
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {formatVND(order.total)}
                  {order.paid_amount < order.total && (
                    <div className="text-xs font-medium text-amber-600">
                      Nợ {formatVND(order.total - order.paid_amount)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Chưa có đơn hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
