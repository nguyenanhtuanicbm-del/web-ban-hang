import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatVariantAttributes } from "@/lib/types";
import StockCountForm, { type StockCountItemInput } from "@/components/admin/StockCountForm";
import { createStockCount } from "../actions";

export const revalidate = 0;

interface VariantRow {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  unit: string;
  product: { name: string } | null;
}

export default async function NewStockCountPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse_id?: string }>;
}) {
  const { warehouse_id } = await searchParams;
  const supabase = await createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("*").order("name");

  if (!warehouse_id) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Tạo phiếu kiểm kho</h1>
        <p className="text-sm text-gray-500">Chọn kho cần kiểm:</p>
        <div className="flex flex-wrap gap-2">
          {(warehouses ?? []).map((w) => (
            <Link
              key={w.id}
              href={`/admin/kho/kiem-ke/moi?warehouse_id=${w.id}`}
              className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
            >
              {w.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const warehouse = (warehouses ?? []).find((w) => w.id === warehouse_id);
  if (!warehouse) notFound();

  const [{ data: variants }, { data: stockRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, sku, attributes, unit, product:products(name)")
      .eq("is_active", true),
    supabase.from("inventory_stock").select("variant_id, quantity").eq("warehouse_id", warehouse_id),
  ]);

  const stockMap = new Map((stockRows ?? []).map((s) => [s.variant_id, s.quantity]));

  const items: StockCountItemInput[] = ((variants ?? []) as unknown as VariantRow[]).map((v) => {
    const attrLabel = formatVariantAttributes(v.attributes);
    return {
      variantId: v.id,
      label: attrLabel ? `${v.product?.name} (${attrLabel})` : v.product?.name ?? "Sản phẩm",
      sku: v.sku,
      unit: v.unit || "Cái",
      systemQuantity: stockMap.get(v.id) ?? 0,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Kiểm kho — {warehouse.name}</h1>
      <StockCountForm warehouseId={warehouse_id} items={items} action={createStockCount} />
    </div>
  );
}
