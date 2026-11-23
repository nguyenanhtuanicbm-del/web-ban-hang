import { createClient } from "@/lib/supabase/server";
import { getAllProductsForAdmin } from "@/lib/queries";
import PurchaseOrderForm from "@/components/admin/PurchaseOrderForm";
import { createPurchaseOrder } from "../actions";

export const revalidate = 0;

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();
  const [products, { data: suppliers }, { data: warehouses }] = await Promise.all([
    getAllProductsForAdmin(),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("warehouses").select("*").order("name"),
  ]);

  const defaultWarehouseId = (warehouses ?? []).find((w) => w.is_default)?.id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Tạo phiếu nhập hàng</h1>
      <PurchaseOrderForm
        products={products}
        suppliers={suppliers ?? []}
        warehouses={warehouses ?? []}
        defaultWarehouseId={defaultWarehouseId}
        action={createPurchaseOrder}
      />
    </div>
  );
}
