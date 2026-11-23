import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus } from "@/lib/types";
import { updateOrderStatus } from "../actions";

export const revalidate = 0;

const STATUSES: OrderStatus[] = ["new", "processing", "completed", "cancelled"];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/admin/don-hang" className="text-sm text-brand-600 hover:underline">
        ← Quay lại danh sách đơn hàng
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Đơn hàng {order.code}</h1>
        <form action={updateOrderStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={order.id} />
          <select
            name="status"
            defaultValue={order.status}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Cập nhật
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-gray-900">Thông tin khách hàng</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">Họ tên</dt>
          <dd>{order.customer_name}</dd>
          <dt className="text-gray-500">Điện thoại</dt>
          <dd>{order.phone}</dd>
          <dt className="text-gray-500">Địa chỉ</dt>
          <dd>{order.address || "—"}</dd>
          <dt className="text-gray-500">Ghi chú</dt>
          <dd>{order.note || "—"}</dd>
          <dt className="text-gray-500">Nguồn</dt>
          <dd>{order.source === "in_store" ? "Bán tại cửa hàng" : "Đặt online"}</dd>
          <dt className="text-gray-500">Thanh toán</dt>
          <dd>{PAYMENT_METHOD_LABEL[order.payment_method as keyof typeof PAYMENT_METHOD_LABEL]}</dd>
          <dt className="text-gray-500">Đã thanh toán</dt>
          <dd>{formatVND(order.paid_amount)}</dd>
          {order.paid_amount < order.total && (
            <>
              <dt className="text-gray-500">Còn nợ</dt>
              <dd className="font-semibold text-amber-600">
                {formatVND(order.total - order.paid_amount)}
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-gray-900">Sản phẩm</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {order.order_items.map(
            (item: { id: string; product_name: string; quantity: number; unit_price: number }) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {item.product_name} x{item.quantity}
                </span>
                <span className="font-medium">{formatVND(item.unit_price * item.quantity)}</span>
              </div>
            )
          )}
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span>Tổng cộng</span>
          <span className="text-brand-600">{formatVND(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
