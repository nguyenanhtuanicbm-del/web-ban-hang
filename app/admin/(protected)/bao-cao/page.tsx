import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";

export const revalidate = 0;

interface ReportOrderItem {
  quantity: number;
  unit_price: number;
  product_name: string;
  variant: { cost_price: number } | null;
}

interface ReportOrderRow {
  id: string;
  created_at: string;
  total: number;
  order_items: ReportOrderItem[];
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const fromDate = parseDateInput(from, defaultFrom);
  const toDate = parseDateInput(to, today);
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setDate(toDateExclusive.getDate() + 1);

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, created_at, total, order_items(quantity, unit_price, product_name, variant:product_variants(cost_price))"
    )
    .neq("status", "cancelled")
    .gte("created_at", fromDate.toISOString())
    .lt("created_at", toDateExclusive.toISOString())
    .order("created_at", { ascending: true });

  const rows = (orders ?? []) as unknown as ReportOrderRow[];

  let totalRevenue = 0;
  let totalCost = 0;
  const dailyMap = new Map<string, number>();
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const o of rows) {
    totalRevenue += Number(o.total);

    const dayKey = formatDateInput(new Date(o.created_at));
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + Number(o.total));

    for (const item of o.order_items) {
      totalCost += Number(item.quantity) * Number(item.variant?.cost_price ?? 0);

      const key = item.product_name;
      if (!productMap.has(key)) {
        productMap.set(key, { name: item.product_name, quantity: 0, revenue: 0 });
      }
      const entry = productMap.get(key)!;
      entry.quantity += Number(item.quantity);
      entry.revenue += Number(item.quantity) * Number(item.unit_price);
    }
  }

  const totalProfit = totalRevenue - totalCost;

  const dailyData: { date: string; label: string; revenue: number }[] = [];
  for (let d = new Date(fromDate); d < toDateExclusive; d.setDate(d.getDate() + 1)) {
    const key = formatDateInput(d);
    dailyData.push({
      date: key,
      label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      revenue: dailyMap.get(key) ?? 0,
    });
  }
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);
  const chartHeightPx = 160;

  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  function presetLink(fromVal: Date, toVal: Date) {
    return `/admin/bao-cao?from=${formatDateInput(fromVal)}&to=${formatDateInput(toVal)}`;
  }

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Doanh thu &amp; lợi nhuận</h1>
        <p className="text-sm text-gray-500">
          Từ {fromDate.toLocaleDateString("vi-VN")} đến {toDate.toLocaleDateString("vi-VN")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={presetLink(today, today)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          Hôm nay
        </Link>
        <Link
          href={presetLink(sevenDaysAgo, today)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          7 ngày qua
        </Link>
        <Link
          href={presetLink(thirtyDaysAgo, today)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          30 ngày qua
        </Link>
        <Link
          href={presetLink(startOfMonth, today)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          Tháng này
        </Link>

        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={formatDateInput(fromDate)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
          <span className="text-sm text-gray-400">đến</span>
          <input
            type="date"
            name="to"
            defaultValue={formatDateInput(toDate)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Xem
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Số đơn hàng</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Tổng doanh thu</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatVND(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Tổng vốn hàng bán</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatVND(totalCost)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Lợi nhuận</p>
          <p className={`mt-1 text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatVND(totalProfit)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-gray-900">Doanh thu theo ngày</h2>
        {dailyData.length > 0 ? (
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: chartHeightPx + 24 }}>
            {dailyData.map((d) => {
              const barHeight = maxRevenue > 0 ? Math.round((d.revenue / maxRevenue) * chartHeightPx) : 0;
              return (
                <div
                  key={d.date}
                  className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1"
                  title={`${d.label}: ${formatVND(d.revenue)}`}
                >
                  <div
                    className="w-full rounded-t bg-brand-500"
                    style={{ height: `${barHeight}px` }}
                  />
                  <span className="text-[10px] text-gray-400">{d.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Không có dữ liệu trong khoảng thời gian này.</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Top sản phẩm bán chạy</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Sản phẩm</th>
              <th className="px-4 py-2 text-right">Số lượng bán</th>
              <th className="px-4 py-2 text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.name} className="border-t border-gray-100">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-right">{p.quantity.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2 text-right font-medium">{formatVND(p.revenue)}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Không có dữ liệu trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
