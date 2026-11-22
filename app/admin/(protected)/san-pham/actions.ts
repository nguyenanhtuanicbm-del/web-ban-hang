"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const categoryId = String(formData.get("category_id") || "") || null;
  const price = Number(formData.get("price") || 0);
  const compareAtPriceRaw = String(formData.get("compare_at_price") || "").trim();
  const compareAtPrice = compareAtPriceRaw ? Number(compareAtPriceRaw) : null;
  const stock = Number(formData.get("stock") || 0);
  const description = String(formData.get("description") || "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  return {
    name,
    slug: slugify(slugInput || name),
    category_id: categoryId,
    price,
    compare_at_price: compareAtPrice,
    stock,
    description,
    is_active: isActive,
  };
}

async function uploadImages(
  supabase: SupabaseServerClient,
  productId: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (error) continue;

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

export async function createProduct(formData: FormData) {
  const fields = parseProductFields(formData);
  if (!fields.name || !fields.price) return;

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...fields, images: [] })
    .select()
    .single();

  if (error || !product) return;

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const urls = await uploadImages(supabase, product.id, files);

  if (urls.length > 0) {
    await supabase.from("products").update({ images: urls }).eq("id", product.id);
  }

  revalidatePath("/admin/san-pham");
  redirect("/admin/san-pham");
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const fields = parseProductFields(formData);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single();

  const keepUrls = formData.getAll("keep_image").map(String);
  let images: string[] = (existing?.images ?? []).filter((url: string) => keepUrls.includes(url));

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const newUrls = await uploadImages(supabase, id, files);
  images = [...images, ...newUrls];

  await supabase.from("products").update({ ...fields, images }).eq("id", id);

  revalidatePath("/admin/san-pham");
  redirect("/admin/san-pham");
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/san-pham");
}
