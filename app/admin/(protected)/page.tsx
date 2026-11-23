import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order } from "@/lib/types";

export const revalidate = 0;

interface LowStockRow {
  variant_id: string;
  product_id: string;
  sku: string;
  low_stock_threshold: number;
  total_quantity: number;
  product: { name: string } | null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newOrders, todayOrders, lowStock, recentOrders] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("orders")
      .select("total")
      .neq("status", "cancelled")
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("low_stock_variants")
      .select("*, product:products(name)")
      .order("total_quantity", { ascending: true })
      .limit(10),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const revenueToday = (todayOrders.data ?? []).reduce((sum, o) => sum + Number(o.total), 0);
  const lowStockRows = (lowStock.data ?? []) as LowStockRow[];

  const stats = [
    { label: "Đơn hàng mới", value: newOrders.count ?? 0 },
    { label: "Doanh thu hôm nay", value: formatVND(revenueToday) },
    { label: "Sắp hết hàng", value: lowStockRows.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Tổng quan</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Đơn hàng gần đây</h2>
            <Link href="/admin/don-hang" className="text-sm font-medium text-brand-600 hover:underline">
              Xem tất cả
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2">Mã đơn</th>
                <th className="px-4 py-2">Khách hàng</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {((recentOrders.data as Order[]) ?? []).map((order) => (
                <tr key={order.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/admin/don-hang/${order.id}`} className="text-brand-600 hover:underline">
                      {order.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{order.customer_name}</td>
                  <td className="px-4 py-2">{ORDER_STATUS_LABEL[order.status]}</td>
                  <td className="px-4 py-2 text-right">{formatVND(order.total)}</td>
                </tr>
              ))}
              {(recentOrders.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Sắp hết hàng</h2>
            <Link href="/admin/san-pham" className="text-sm font-medium text-brand-600 hover:underline">
              Quản lý sản phẩm
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2">Sản phẩm</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Tồn / Ngưỡng</th>
              </tr>
            </thead>
            <tbody>
              {lowStockRows.map((row) => (
                <tr key={row.variant_id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{row.product?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{row.sku}</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-600">
                    {row.total_quantity} / {row.low_stock_threshold}
                  </td>
                </tr>
              ))}
              {lowStockRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                    Không có sản phẩm nào sắp hết hàng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
