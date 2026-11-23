import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVariantAttributes } from "@/lib/types";
import { completeStockCount } from "../actions";

export const revalidate = 0;

interface CountItemRow {
  id: string;
  system_quantity: number;
  counted_quantity: number;
  variant: {
    sku: string;
    attributes: Record<string, string>;
    unit: string;
    product: { name: string } | null;
  } | null;
}

export default async function StockCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: count } = await supabase
    .from("stock_counts")
    .select(
      "*, warehouse:warehouses(name), items:stock_count_items(*, variant:product_variants(sku, attributes, unit, product:products(name)))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!count) notFound();

  const items = (count.items ?? []) as CountItemRow[];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/admin/kho/kiem-ke" className="text-sm text-brand-600 hover:underline">
        ← Quay lại danh sách kiểm kho
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Phiếu kiểm kho {count.code} — {count.warehouse?.name}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {count.status === "completed" ? "Đã hoàn tất" : "Nháp"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2">Sản phẩm</th>
              <th className="px-3 py-2">ĐVT</th>
              <th className="px-3 py-2 text-right">Tồn hệ thống</th>
              <th className="px-3 py-2 text-right">Tồn thực tế</th>
              <th className="px-3 py-2 text-right">Lệch</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const diff = item.counted_quantity - item.system_quantity;
              const attrLabel = item.variant ? formatVariantAttributes(item.variant.attributes) : "";
              return (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    {item.variant?.product?.name}
                    {attrLabel ? ` (${attrLabel})` : ""}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{item.variant?.unit}</td>
                  <td className="px-3 py-2 text-right">{item.system_quantity}</td>
                  <td className="px-3 py-2 text-right">{item.counted_quantity}</td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      diff === 0 ? "text-gray-400" : diff > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {count.status === "draft" && (
        <form action={completeStockCount}>
          <input type="hidden" name="id" value={count.id} />
          <button
            type="submit"
            className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Hoàn tất kiểm kho (áp dụng chênh lệch vào tồn kho)
          </button>
        </form>
      )}

      {count.status === "completed" && (
        <p className="text-sm text-gray-500">
          Phiếu đã hoàn tất — chênh lệch đã được ghi vào thẻ kho và cập nhật tồn kho.
        </p>
      )}
    </div>
  );
}
