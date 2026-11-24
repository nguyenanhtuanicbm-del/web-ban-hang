import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductByIdForAdmin } from "@/lib/queries";
import ProductForm from "@/components/admin/ProductForm";
import { adjustVariantStock, updateProduct } from "../actions";

export const revalidate = 0;

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [product, { data: categories }] = await Promise.all([
    getProductByIdForAdmin(id),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Sửa sản phẩm</h1>
      <ProductForm
        categories={categories ?? []}
        product={product}
        action={updateProduct}
        onAdjustStock={adjustVariantStock}
      />
    </div>
  );
}
