import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export const revalidate = 0;

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Thêm sản phẩm</h1>
      <ProductForm categories={categories ?? []} action={createProduct} />
    </div>
  );
}
