import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatVND } from "@/lib/format";

export const revalidate = 0;

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("code", code)
    .maybeSingle();

  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
      <CheckCircle2 className="h-16 w-16 text-brand-600" />
      <h1 className="text-xl font-bold text-gray-900">Đặt hàng thành công!</h1>
      <p className="text-gray-600">
        Mã đơn hàng của bạn là <span className="font-semibold text-gray-900">{order.code}</span>.
        Chúng tôi sẽ liên hệ số điện thoại {order.phone} để xác nhận.
      </p>

      <div className="mt-4 w-full rounded-lg border border-gray-200 p-4 text-left">
        {order.order_items.map(
          (item: { id: string; product_name: string; quantity: number; unit_price: number }) => (
            <div key={item.id} className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">
                {item.product_name} x{item.quantity}
              </span>
              <span className="font-medium text-gray-900">
                {formatVND(item.unit_price * item.quantity)}
              </span>
            </div>
          )
        )}
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span>Tổng cộng</span>
          <span className="text-brand-600">{formatVND(order.total)}</span>
        </div>
      </div>

      <Link
        href="/san-pham"
        className="mt-4 rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
      >
        Tiếp tục mua sắm
      </Link>
    </div>
  );
}
