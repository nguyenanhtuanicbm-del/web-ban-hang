import { createClient } from "@/lib/supabase/server";
import { formatVariantAttributes, type StockChangeType } from "@/lib/types";

export const revalidate = 0;

const CHANGE_TYPE_LABEL: Record<StockChangeType, string> = {
  purchase: "Nhập hàng",
  sale: "Bán hàng",
  sale_return: "Khách trả hàng",
  transfer_out: "Chuyển đi",
  transfer_in: "Chuyển đến",
  count_adjustment: "Điều chỉnh kiểm kho",
  manual: "Điều chỉnh thủ công",
};

interface LedgerRow {
  id: string;
  created_at: string;
  change_type: StockChangeType;
  quantity_change: number;
  balance_after: number;
  note: string | null;
  variant: {
    sku: string;
    attributes: Record<string, string>;
    unit: string;
    product: { name: string } | null;
  } | null;
  warehouse: { name: string } | null;
}

async function findMatchingVariantIds(supabase: Awaited<ReturnType<typeof createClient>>, q: string) {
  const [{ data: bySku }, { data: products }] = await Promise.all([
    supabase.from("product_variants").select("id").ilike("sku", `%${q}%`),
    supabase.from("products").select("id").ilike("name", `%${q}%`),
  ]);

  const productIds = (products ?? []).map((p) => p.id);
  let byProduct: { id: string }[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase.from("product_variants").select("id").in("product_id", productIds);
    byProduct = data ?? [];
  }

  return [...new Set([...(bySku ?? []).map((v) => v.id), ...byProduct.map((v) => v.id)])];
}

export default async function StockLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let entries: LedgerRow[] = [];

  if (q?.trim()) {
    const variantIds = await findMatchingVariantIds(supabase, q.trim());
    if (variantIds.length > 0) {
      const { data } = await supabase
        .from("stock_ledger")
        .select(
          "*, variant:product_variants(sku, attributes, unit, product:products(name)), warehouse:warehouses(name)"
        )
        .in("variant_id", variantIds)
        .order("created_at", { ascending: false })
        .limit(200);
      entries = (data ?? []) as LedgerRow[];
    }
  } else {
    const { data } = await supabase
      .from("stock_ledger")
      .select(
        "*, variant:product_variants(sku, attributes, product:products(name)), warehouse:warehouses(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    entries = (data ?? []) as LedgerRow[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Thẻ kho</h1>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên sản phẩm hoặc SKU..."
          className="max-w-sm flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Điện thoại: dạng thẻ — bảng 7 cột không cuộn ngang được hợp lý trên màn hình nhỏ */}
      <div className="flex flex-col gap-3 sm:hidden">
        {entries.map((e) => {
          const attrLabel = e.variant ? formatVariantAttributes(e.variant.attributes) : "";
          return (
            <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {e.variant?.product?.name}
                    {attrLabel ? ` (${attrLabel})` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{e.variant?.sku}</p>
                </div>
                <span
                  className={`flex-shrink-0 font-medium ${
                    e.quantity_change > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {e.quantity_change > 0 ? `+${e.quantity_change}` : e.quantity_change} {e.variant?.unit}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {CHANGE_TYPE_LABEL[e.change_type]} · {e.warehouse?.name ?? "—"}
                </span>
                <span>
                  Tồn sau: {e.balance_after} {e.variant?.unit}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(e.created_at).toLocaleString("vi-VN")}
              </p>
              {e.note && <p className="mt-1 text-xs text-gray-500">{e.note}</p>}
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-gray-400">
            Chưa có biến động tồn kho nào.
          </p>
        )}
      </div>

      {/* Máy tính/tablet: bảng đầy đủ */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Thời gian</th>
              <th className="px-4 py-2">Sản phẩm</th>
              <th className="px-4 py-2">Kho</th>
              <th className="px-4 py-2">Loại</th>
              <th className="px-4 py-2 text-right">Thay đổi</th>
              <th className="px-4 py-2 text-right">Tồn sau</th>
              <th className="px-4 py-2">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const attrLabel = e.variant ? formatVariantAttributes(e.variant.attributes) : "";
              return (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(e.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2">
                    {e.variant?.product?.name}
                    {attrLabel ? ` (${attrLabel})` : ""}
                    <div className="text-xs text-gray-400">{e.variant?.sku}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{e.warehouse?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-700">{CHANGE_TYPE_LABEL[e.change_type]}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      e.quantity_change > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {e.quantity_change > 0 ? `+${e.quantity_change}` : e.quantity_change} {e.variant?.unit}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.balance_after} {e.variant?.unit}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{e.note || "—"}</td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Chưa có biến động tồn kho nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
