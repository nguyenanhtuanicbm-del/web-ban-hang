import { createClient } from "@/lib/supabase/server";
import { formatVariantAttributes } from "@/lib/types";
import StockTransferForm from "@/components/admin/StockTransferForm";
import { createStockTransfer } from "../actions";

export const revalidate = 0;

interface VariantRow {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  unit: string;
  product: { name: string } | null;
}

export default async function NewStockTransferPage() {
  const supabase = await createClient();
  const [{ data: variantsRaw }, { data: warehouses }, { data: stockRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, sku, attributes, unit, product:products(name)")
      .eq("is_active", true),
    supabase.from("warehouses").select("*").order("name"),
    supabase.from("inventory_stock").select("variant_id, warehouse_id, quantity"),
  ]);

  const variants = ((variantsRaw ?? []) as unknown as VariantRow[]).map((v) => {
    const attrLabel = formatVariantAttributes(v.attributes);
    return {
      variantId: v.id,
      label: attrLabel ? `${v.product?.name} (${attrLabel})` : v.product?.name ?? "Sản phẩm",
      sku: v.sku,
      unit: v.unit || "Cái",
    };
  });

  const stock = (stockRows ?? []).map((s) => ({
    variantId: s.variant_id,
    warehouseId: s.warehouse_id,
    quantity: s.quantity,
  }));

  if ((warehouses ?? []).length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900">Điều chuyển kho</h1>
        <p className="text-gray-500">
          Cần có ít nhất 2 kho để điều chuyển hàng. Vào &quot;Kho hàng&quot; để thêm kho mới.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Tạo phiếu điều chuyển kho</h1>
      <StockTransferForm
        variants={variants}
        warehouses={warehouses ?? []}
        stock={stock}
        action={createStockTransfer}
      />
    </div>
  );
}
