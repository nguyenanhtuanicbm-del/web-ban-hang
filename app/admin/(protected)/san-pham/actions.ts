"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { applyStockChange, getDefaultPriceListId, getDefaultWarehouseId } from "@/lib/stock";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface VariantRowInput {
  key: string;
  dbId: string | null;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  lowStockThreshold: string;
  initialStock: string;
  currentStock: number | null;
  isActive: boolean;
}

function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const categoryId = String(formData.get("category_id") || "") || null;
  const description = String(formData.get("description") || "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  return {
    name,
    slug: slugify(slugInput || name),
    category_id: categoryId,
    description,
    is_active: isActive,
  };
}

function parseVariantRows(formData: FormData): VariantRowInput[] {
  try {
    const raw = JSON.parse(String(formData.get("variants_json") || "[]"));
    if (!Array.isArray(raw)) return [];
    return raw.filter((r) => r && typeof r.sku === "string" && r.sku.trim());
  } catch {
    return [];
  }
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
  if (!fields.name) return;

  const variantRows = parseVariantRows(formData);
  if (variantRows.length === 0) return;

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

  const [defaultWarehouseId, defaultPriceListId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
    supabase.auth.getUser(),
  ]);
  const createdBy = userResult.data.user?.id ?? null;

  for (const row of variantRows) {
    const { data: variant } = await supabase
      .from("product_variants")
      .insert({
        product_id: product.id,
        sku: row.sku.trim(),
        barcode: row.barcode?.trim() || null,
        attributes: row.attributes ?? {},
        cost_price: Number(row.costPrice) || 0,
        low_stock_threshold: Number(row.lowStockThreshold) || 5,
        is_active: row.isActive,
      })
      .select()
      .single();

    if (!variant) continue;

    if (defaultPriceListId) {
      await supabase.from("price_list_items").insert({
        price_list_id: defaultPriceListId,
        variant_id: variant.id,
        price: Number(row.price) || 0,
      });
    }

    const initialStock = Number(row.initialStock) || 0;
    if (initialStock > 0 && defaultWarehouseId) {
      await applyStockChange(supabase, {
        variantId: variant.id,
        warehouseId: defaultWarehouseId,
        quantityChange: initialStock,
        changeType: "manual",
        referenceType: "product_create",
        note: "Tồn kho ban đầu khi tạo sản phẩm",
        createdBy,
      });
    }
  }

  revalidatePath("/admin/san-pham");
  redirect("/admin/san-pham");
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const fields = parseProductFields(formData);
  const variantRows = parseVariantRows(formData);
  const supabase = await createClient();

  await supabase.from("products").update(fields).eq("id", id);

  const { data: existing } = await supabase.from("products").select("images").eq("id", id).single();
  const keepUrls = formData.getAll("keep_image").map(String);
  let images: string[] = (existing?.images ?? []).filter((url: string) => keepUrls.includes(url));

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const newUrls = await uploadImages(supabase, id, files);
  images = [...images, ...newUrls];
  await supabase.from("products").update({ images }).eq("id", id);

  const [defaultWarehouseId, defaultPriceListId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
    supabase.auth.getUser(),
  ]);
  const createdBy = userResult.data.user?.id ?? null;

  for (const row of variantRows) {
    const price = Number(row.price) || 0;
    const costPrice = Number(row.costPrice) || 0;
    const lowStockThreshold = Number(row.lowStockThreshold) || 5;

    if (row.dbId) {
      await supabase
        .from("product_variants")
        .update({
          sku: row.sku.trim(),
          barcode: row.barcode?.trim() || null,
          attributes: row.attributes ?? {},
          cost_price: costPrice,
          low_stock_threshold: lowStockThreshold,
          is_active: row.isActive,
        })
        .eq("id", row.dbId);

      if (defaultPriceListId) {
        await supabase
          .from("price_list_items")
          .upsert(
            { price_list_id: defaultPriceListId, variant_id: row.dbId, price },
            { onConflict: "price_list_id,variant_id" }
          );
      }
      continue;
    }

    const { data: variant } = await supabase
      .from("product_variants")
      .insert({
        product_id: id,
        sku: row.sku.trim(),
        barcode: row.barcode?.trim() || null,
        attributes: row.attributes ?? {},
        cost_price: costPrice,
        low_stock_threshold: lowStockThreshold,
        is_active: row.isActive,
      })
      .select()
      .single();

    if (!variant) continue;

    if (defaultPriceListId) {
      await supabase
        .from("price_list_items")
        .insert({ price_list_id: defaultPriceListId, variant_id: variant.id, price });
    }

    const initialStock = Number(row.initialStock) || 0;
    if (initialStock > 0 && defaultWarehouseId) {
      await applyStockChange(supabase, {
        variantId: variant.id,
        warehouseId: defaultWarehouseId,
        quantityChange: initialStock,
        changeType: "manual",
        referenceType: "product_update",
        note: "Tồn kho ban đầu khi thêm biến thể mới",
        createdBy,
      });
    }
  }

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
