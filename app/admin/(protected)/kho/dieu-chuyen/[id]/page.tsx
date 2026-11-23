import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVariantAttributes } from "@/lib/types";
import { completeStockTransfer } from "../actions";

export const revalidate = 0;

interface TransferItemRow {
  id: string;
  quantity: number;
  variant: {
    attributes: Record<string, string>;
    product: { name: string } | null;
  } | null;
}

export default async function StockTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select(
      "*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name), items:stock_transfer_items(*, variant:product_variants(attributes, product:products(name)))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!transfer) notFound();

  const items = (transfer.items ?? []) as TransferItemRow[];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/admin/kho/dieu-chuyen" className="text-sm text-brand-600 hover:underline">
        ← Quay lại danh sách điều chuyển
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Phiếu điều chuyển {transfer.code}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {transfer.status === "completed" ? "Đã hoàn tất" : "Nháp"}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">Từ kho</dt>
          <dd>{transfer.from_warehouse?.name}</dd>
          <dt className="text-gray-500">Đến kho</dt>
          <dd>{transfer.to_warehouse?.name}</dd>
          <dt className="text-gray-500">Ghi chú</dt>
          <dd>{transfer.note || "—"}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-gray-900">Sản phẩm</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {items.map((item) => {
            const attrLabel = item.variant ? formatVariantAttributes(item.variant.attributes) : "";
            return (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {item.variant?.product?.name}
                  {attrLabel ? ` (${attrLabel})` : ""}
                </span>
                <span className="font-medium">{item.quantity}</span>
              </div>
            );
          })}
        </div>
      </div>

      {transfer.status === "draft" && (
        <form action={completeStockTransfer}>
          <input type="hidden" name="id" value={transfer.id} />
          <button
            type="submit"
            className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Hoàn tất điều chuyển
          </button>
        </form>
      )}

      {transfer.status === "completed" && (
        <p className="text-sm text-gray-500">
          Phiếu đã hoàn tất — tồn kho nguồn đã giảm và kho đích đã tăng tương ứng.
        </p>
      )}
    </div>
  );
}
