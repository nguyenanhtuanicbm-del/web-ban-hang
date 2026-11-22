import { createClient } from "@/lib/supabase/server";
import InStoreSaleForm from "@/components/admin/InStoreSaleForm";
import { createInStoreOrder } from "./actions";

export const revalidate = 0;

export default async function InStoreSalePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Bán tại cửa hàng</h1>
      <p className="text-sm text-gray-500">
        Dùng khi khách mua trực tiếp tại cửa hàng. Đơn hàng sẽ tự động ghi nhận là đã hoàn thành
        và trừ tồn kho ngay.
      </p>
      <InStoreSaleForm products={products ?? []} action={createInStoreOrder} />
    </div>
  );
}
