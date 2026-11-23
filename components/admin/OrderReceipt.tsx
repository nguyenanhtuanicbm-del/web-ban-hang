import { formatVND } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/types";

interface ReceiptItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit?: string | null;
}

/**
 * Khổ giấy 80mm (@page trong globals.css) — chỉ hiển thị khi in (xem `hidden print:block`
 * ở nơi dùng component này), nhờ vậy không ảnh hưởng giao diện xem bình thường.
 */
export default function OrderReceipt({
  storeName,
  order,
  items,
}: {
  storeName: string;
  order: {
    code: string;
    created_at: string;
    customer_name: string;
    phone: string;
    address: string | null;
    payment_method: PaymentMethod;
    paid_amount: number;
    total: number;
  };
  items: ReceiptItem[];
}) {
  const debt = order.total - order.paid_amount;

  return (
    <div id="print-receipt" className="mx-auto w-[72mm] font-mono text-[12px] leading-tight text-black">
      <p className="text-center text-sm font-bold">{storeName}</p>
      <p className="text-center">Hóa đơn bán hàng</p>
      <div className="my-2 border-t border-dashed border-black" />

      <p>Mã đơn: {order.code}</p>
      <p>Ngày: {new Date(order.created_at).toLocaleString("vi-VN")}</p>
      <p>Khách: {order.customer_name}</p>
      {order.phone && order.phone !== "—" && <p>ĐT: {order.phone}</p>}
      {order.address && <p>Địa chỉ: {order.address}</p>}

      <div className="my-2 border-t border-dashed border-black" />

      {items.map((item) => (
        <div key={item.id} className="mb-1">
          <p>{item.product_name}</p>
          <div className="flex justify-between">
            <span>
              {item.quantity} {item.unit || ""} x {formatVND(item.unit_price)}
            </span>
            <span>{formatVND(item.quantity * item.unit_price)}</span>
          </div>
        </div>
      ))}

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex justify-between font-bold">
        <span>Tổng cộng</span>
        <span>{formatVND(order.total)}</span>
      </div>
      <p>Thanh toán: {PAYMENT_METHOD_LABEL[order.payment_method]}</p>
      <div className="flex justify-between">
        <span>Đã thanh toán</span>
        <span>{formatVND(order.paid_amount)}</span>
      </div>
      {debt > 0 && (
        <div className="flex justify-between font-bold">
          <span>Còn nợ</span>
          <span>{formatVND(debt)}</span>
        </div>
      )}

      <div className="my-2 border-t border-dashed border-black" />
      <p className="text-center">Cảm ơn quý khách!</p>
    </div>
  );
}
