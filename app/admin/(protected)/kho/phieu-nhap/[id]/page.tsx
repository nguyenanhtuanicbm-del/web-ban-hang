import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import { formatVariantAttributes } from "@/lib/types";
import { receivePurchaseOrder, cancelPurchaseOrder } from "../actions";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  received: "Đã nhận hàng",
  cancelled: "Đã hủy",
};

interface PoItemRow {
  id: string;
  quantity: number;
  unit_cost: number;
  lot_code: string | null;
  expiry_date: string | null;
  variant: {
    sku: string;
    attributes: Record<string, string>;
    unit: string;
    product: { name: string } | null;
  } | null;
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(
      "*, supplier:suppliers(name), warehouse:warehouses(name), items:purchase_order_items(*, variant:product_variants(sku, attributes, unit, product:products(name)))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!po) notFound();

  const items = (po.items ?? []) as PoItemRow[];
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/admin/kho/phieu-nhap" className="text-sm text-brand-600 hover:underline">
        ← Quay lại danh sách phiếu nhập
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Phiếu nhập {po.code}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {STATUS_LABEL[po.status]}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">Nhà cung cấp</dt>
          <dd>{po.supplier?.name ?? "—"}</dd>
          <dt className="text-gray-500">Kho nhập</dt>
          <dd>{po.warehouse?.name ?? "—"}</dd>
          <dt className="text-gray-500">Ghi chú</dt>
          <dd>{po.note || "—"}</dd>
          {po.received_at && (
            <>
              <dt className="text-gray-500">Đã nhận lúc</dt>
              <dd>{new Date(po.received_at).toLocaleString("vi-VN")}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-gray-900">Sản phẩm</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {items.map((item) => {
            const attrLabel = item.variant ? formatVariantAttributes(item.variant.attributes) : "";
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <div>
                    {item.variant?.product?.name ?? "Sản phẩm"}
                    {attrLabel ? ` (${attrLabel})` : ""}
                  </div>
                  <div className="text-xs text-gray-400">
                    SL: {item.quantity} {item.variant?.unit} × {formatVND(item.unit_cost)}
                    {item.lot_code ? ` · Lô ${item.lot_code}` : ""}
                    {item.expiry_date ? ` · HSD ${item.expiry_date}` : ""}
                  </div>
                </div>
                <span className="font-medium">{formatVND(item.quantity * item.unit_cost)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-col items-end gap-1 border-t border-gray-200 pt-2 text-sm">
          <span>Tạm tính: {formatVND(subtotal)}</span>
          <span>Chi phí khác: {formatVND(po.other_cost)}</span>
          <span className="font-semibold text-brand-600">Tổng cộng: {formatVND(po.total_amount)}</span>
        </div>
      </div>

      {po.status === "draft" && (
        <div className="flex gap-3">
          <form action={receivePurchaseOrder}>
            <input type="hidden" name="id" value={po.id} />
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              Nhận hàng (cập nhật tồn kho &amp; giá vốn)
            </button>
          </form>
          <form action={cancelPurchaseOrder}>
            <input type="hidden" name="id" value={po.id} />
            <button
              type="submit"
              className="rounded-md border border-red-500 px-6 py-3 font-medium text-red-500 hover:bg-red-50"
            >
              Hủy phiếu
            </button>
          </form>
        </div>
      )}

      {po.status === "received" && (
        <p className="text-sm text-gray-500">
          Phiếu đã nhận hàng — tồn kho và giá vốn bình quân của các sản phẩm đã được cập nhật.
        </p>
      )}
    </div>
  );
}
