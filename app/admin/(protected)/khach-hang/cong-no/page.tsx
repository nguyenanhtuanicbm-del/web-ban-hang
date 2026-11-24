import Link from "next/link";
import { HandCoins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";

export const revalidate = 0;

interface DebtOrderRow {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  total: number;
  paid_amount: number;
  created_at: string;
}

interface CustomerDebt {
  key: string;
  customerName: string;
  phone: string;
  totalDebt: number;
  orders: { id: string; code: string; total: number; debt: number; createdAt: string }[];
}

export default async function CustomerDebtPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, code, customer_id, customer_name, phone, total, paid_amount, created_at")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  const debtOrders = ((orders ?? []) as DebtOrderRow[]).filter((o) => o.total > o.paid_amount);

  const map = new Map<string, CustomerDebt>();
  for (const o of debtOrders) {
    const key = o.customer_id ?? `phone:${o.phone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        customerName: o.customer_name,
        phone: o.phone,
        totalDebt: 0,
        orders: [],
      });
    }
    const entry = map.get(key)!;
    const debt = o.total - o.paid_amount;
    entry.totalDebt += debt;
    entry.orders.push({ id: o.id, code: o.code, total: o.total, debt, createdAt: o.created_at });
  }

  let customers = [...map.values()].sort((a, b) => b.totalDebt - a.totalDebt);

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    customers = customers.filter(
      (c) => c.customerName.toLowerCase().includes(needle) || c.phone.toLowerCase().includes(needle)
    );
  }

  const grandTotal = customers.reduce((sum, c) => sum + c.totalDebt, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Công nợ khách hàng</h1>
        <p className="text-sm text-gray-500">
          Các khách hàng còn nợ tiền (đơn bán chịu hoặc chưa thanh toán đủ).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Tổng công nợ</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatVND(grandTotal)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Số khách hàng đang nợ</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          className="max-w-xs flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Tìm kiếm
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {customers.map((c) => (
          <div key={c.key} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{c.customerName}</p>
                <p className="text-sm text-gray-500">{c.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Tổng nợ</p>
                <p className="text-lg font-bold text-red-600">{formatVND(c.totalDebt)}</p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-md border border-gray-100">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-3 py-1.5">Mã đơn</th>
                    <th className="px-3 py-1.5">Ngày</th>
                    <th className="px-3 py-1.5 text-right">Tổng tiền</th>
                    <th className="px-3 py-1.5 text-right">Còn nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {c.orders.map((o) => (
                    <tr key={o.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/admin/don-hang/${o.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {o.code}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-3 py-1.5 text-right">{formatVND(o.total)}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-red-600">
                        {formatVND(o.debt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 py-10 text-center text-gray-400">
            <HandCoins className="h-8 w-8" />
            <p>Không có khách hàng nào đang nợ.</p>
          </div>
        )}
      </div>
    </div>
  );
}
