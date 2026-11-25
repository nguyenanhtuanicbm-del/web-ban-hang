import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus, type PaymentMethod } from "@/lib/types";
import CancelOrderButton from "@/components/admin/CancelOrderButton";
import PrintReceiptButton from "@/components/admin/PrintReceiptButton";
import OrderReceipt from "@/components/admin/OrderReceipt";
import EditableCustomerInfo from "@/components/admin/EditableCustomerInfo";
import { updateOrderStatus, cancelOrder, updateOrderCustomerInfo } from "../actions";

export const revalidate = 0;

const STATUSES: OrderStatus[] = ["new", "processing", "completed"];
const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Cửa hàng của bạn";

interface OrderItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variant: { unit: string } | null;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*, variant:product_variants(unit))")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const items = order.order_items as OrderItemRow[];

  return (
    <>
    <div className="flex max-w-2xl flex-col gap-6 print:hidden">
      <Link href="/admin/don-hang" className="text-sm text-brand-600 hover:underline">
        ← Quay lại danh sách đơn hàng
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">Đơn hàng {order.code}</h1>
        <div className="flex items-center gap-2">
          <PrintReceiptButton />
          {order.status === "cancelled" ? (
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">
              Đơn hàng đã hủy
            </span>
          ) : (
            <>
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
              <CancelOrderButton orderId={order.id} action={cancelOrder} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <EditableCustomerInfo
          order={{
            id: order.id,
            customer_name: order.customer_name,
            phone: order.phone,
            address: order.address,
            note: order.note,
          }}
          action={updateOrderCustomerInfo}
        />
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 border-t border-gray-100 pt-3 text-sm">
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
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 py-2 text-sm">
              <div>
                <p className="text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} {item.variant?.unit ?? ""} × {formatVND(item.unit_price)}
                </p>
              </div>
              <span className="flex-shrink-0 font-medium">
                {formatVND(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span>Tổng cộng</span>
          <span className="text-brand-600">{formatVND(order.total)}</span>
        </div>
      </div>

      {order.status === "cancelled" && (
        <p className="text-sm text-gray-500">
          Đơn hàng đã bị hủy — tồn kho các sản phẩm trong đơn đã được hoàn lại.
        </p>
      )}
    </div>

    <div className="hidden print:block">
      <OrderReceipt
        storeName={storeName}
        order={{
          code: order.code,
          created_at: order.created_at,
          customer_name: order.customer_name,
          phone: order.phone,
          address: order.address,
          payment_method: order.payment_method as PaymentMethod,
          paid_amount: order.paid_amount,
          total: order.total,
        }}
        items={items.map((item) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.variant?.unit,
        }))}
      />
    </div>
    </>
  );
}
