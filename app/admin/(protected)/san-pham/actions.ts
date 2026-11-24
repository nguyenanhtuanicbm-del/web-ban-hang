"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { applyStockChange, getDefaultPriceListId, getDefaultWarehouseId } from "@/lib/stock";
import { setFlash } from "@/lib/flash";
import { chunkArray } from "@/lib/utils";
import type { PriceAdjustMode } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
const ID_BATCH_SIZE = 150;

interface VariantRowInput {
  key: string;
  dbId: string | null;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  lowStockThreshold: string;
  unit: string;
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
): Promise<{ urls: string[]; failed: number }> {
  const urls: string[] = [];
  let failed = 0;

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (error) {
      failed += 1;
      continue;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return { urls, failed };
}

export async function createProduct(formData: FormData) {
  const fields = parseProductFields(formData);
  if (!fields.name) {
    await setFlash("error", "Vui lòng nhập tên sản phẩm.");
    return;
  }

  const variantRows = parseVariantRows(formData);
  if (variantRows.length === 0) {
    await setFlash("error", "Cần ít nhất 1 biến thể có SKU và giá bán.");
    return;
  }

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...fields, images: [] })
    .select()
    .single();

  if (error || !product) {
    await setFlash("error", "Không thể tạo sản phẩm, vui lòng thử lại.");
    return;
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const { urls, failed: failedImages } = await uploadImages(supabase, product.id, files);
  if (urls.length > 0) {
    await supabase.from("products").update({ images: urls }).eq("id", product.id);
  }

  const [defaultWarehouseId, defaultPriceListId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
    supabase.auth.getUser(),
  ]);
  const createdBy = userResult.data.user?.id ?? null;
  let stockWarnings = 0;

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
        unit: row.unit?.trim() || "Cái",
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
      const stockResult = await applyStockChange(supabase, {
        variantId: variant.id,
        warehouseId: defaultWarehouseId,
        quantityChange: initialStock,
        changeType: "manual",
        referenceType: "product_create",
        note: "Tồn kho ban đầu khi tạo sản phẩm",
        createdBy,
      });
      if (!stockResult.ok) stockWarnings += 1;
    }
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/");
  revalidatePath(`/san-pham/${product.slug}`);
  await setFlash(
    "success",
    `Đã tạo sản phẩm "${fields.name}".` +
      (failedImages > 0 ? ` (${failedImages} ảnh tải lên thất bại, vui lòng thử lại.)` : "") +
      (stockWarnings > 0 ? ` (${stockWarnings} biến thể không set được tồn kho ban đầu.)` : "")
  );
  redirect("/admin/san-pham");
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã sản phẩm.");
    return;
  }

  const fields = parseProductFields(formData);
  if (!fields.name) {
    await setFlash("error", "Vui lòng nhập tên sản phẩm.");
    return;
  }

  const variantRows = parseVariantRows(formData);
  const supabase = await createClient();

  const { error: updateError } = await supabase.from("products").update(fields).eq("id", id);
  if (updateError) {
    await setFlash("error", "Không thể lưu thay đổi sản phẩm.");
    return;
  }

  const { data: existing } = await supabase.from("products").select("images").eq("id", id).single();
  const keepUrls = formData.getAll("keep_image").map(String);
  let images: string[] = (existing?.images ?? []).filter((url: string) => keepUrls.includes(url));

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const { urls: newUrls, failed: failedImages } = await uploadImages(supabase, id, files);
  images = [...images, ...newUrls];
  await supabase.from("products").update({ images }).eq("id", id);

  const [defaultWarehouseId, defaultPriceListId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
    supabase.auth.getUser(),
  ]);
  const createdBy = userResult.data.user?.id ?? null;
  let stockWarnings = 0;

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
          unit: row.unit?.trim() || "Cái",
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
        unit: row.unit?.trim() || "Cái",
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
      const stockResult = await applyStockChange(supabase, {
        variantId: variant.id,
        warehouseId: defaultWarehouseId,
        quantityChange: initialStock,
        changeType: "manual",
        referenceType: "product_update",
        note: "Tồn kho ban đầu khi thêm biến thể mới",
        createdBy,
      });
      if (!stockResult.ok) stockWarnings += 1;
    }
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/");
  revalidatePath(`/san-pham/${fields.slug}`);
  await setFlash(
    "success",
    `Đã lưu thay đổi sản phẩm "${fields.name}".` +
      (failedImages > 0 ? ` (${failedImages} ảnh tải lên thất bại, vui lòng thử lại.)` : "") +
      (stockWarnings > 0 ? ` (${stockWarnings} biến thể không set được tồn kho ban đầu.)` : "")
  );
  redirect("/admin/san-pham");
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã sản phẩm.");
    return;
  }

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("slug, name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    await setFlash("error", "Không thể xóa sản phẩm, vui lòng thử lại.");
    return;
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/");
  if (product?.slug) revalidatePath(`/san-pham/${product.slug}`);
  await setFlash("success", product?.name ? `Đã xóa sản phẩm "${product.name}".` : "Đã xóa sản phẩm.");
}

export async function deleteProducts(formData: FormData) {
  const ids = formData.getAll("product_ids").map(String).filter(Boolean);
  if (ids.length === 0) {
    await setFlash("error", "Vui lòng chọn ít nhất 1 sản phẩm.");
    return;
  }

  const supabase = await createClient();
  const idBatches = chunkArray(ids, ID_BATCH_SIZE);

  const productResults = await Promise.all(
    idBatches.map((batch) => supabase.from("products").select("slug").in("id", batch))
  );
  const products = productResults.flatMap((r) => r.data ?? []);

  const deleteResults = await Promise.all(
    idBatches.map((batch) => supabase.from("products").delete().in("id", batch))
  );
  const error = deleteResults.find((r) => r.error)?.error;

  if (error) {
    await setFlash("error", "Không thể xóa sản phẩm, vui lòng thử lại.");
    return;
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/");
  for (const p of products) {
    if (p.slug) revalidatePath(`/san-pham/${p.slug}`);
  }
  await setFlash("success", `Đã xóa ${ids.length} sản phẩm.`);
}

function computeAdjustedPrice(current: number, mode: PriceAdjustMode, value: number): number {
  switch (mode) {
    case "percent_increase":
      return current * (1 + value / 100);
    case "percent_decrease":
      return current * (1 - value / 100);
    case "amount_increase":
      return current + value;
    case "amount_decrease":
      return current - value;
    case "set":
      return value;
    default:
      return current;
  }
}

export async function bulkUpdatePrices(formData: FormData) {
  const ids = formData.getAll("product_ids").map(String).filter(Boolean);
  const mode = String(formData.get("mode") || "") as PriceAdjustMode;
  const value = Number(formData.get("value"));

  if (ids.length === 0) {
    await setFlash("error", "Vui lòng chọn ít nhất 1 sản phẩm.");
    return;
  }
  if (!Number.isFinite(value) || value < 0) {
    await setFlash("error", "Giá trị không hợp lệ.");
    return;
  }

  const supabase = await createClient();
  const defaultPriceListId = await getDefaultPriceListId(supabase);
  if (!defaultPriceListId) {
    await setFlash("error", "Chưa thiết lập bảng giá mặc định.");
    return;
  }

  const idBatches = chunkArray(ids, ID_BATCH_SIZE);
  const variantResults = await Promise.all(
    idBatches.map((batch) =>
      supabase.from("product_variants").select("id").in("product_id", batch).eq("is_active", true)
    )
  );
  const variantIds = variantResults.flatMap((r) => (r.data ?? []).map((v) => v.id));

  if (variantIds.length === 0) {
    await setFlash("error", "Không có biến thể nào để cập nhật giá.");
    return;
  }

  const variantIdBatches = chunkArray(variantIds, ID_BATCH_SIZE);
  const priceResults = await Promise.all(
    variantIdBatches.map((batch) =>
      supabase
        .from("price_list_items")
        .select("variant_id, price")
        .eq("price_list_id", defaultPriceListId)
        .in("variant_id", batch)
    )
  );
  const priceMap = new Map(
    priceResults.flatMap((r) => (r.data ?? []).map((p) => [p.variant_id, p.price] as const))
  );

  const updates = variantIds.map((variantId) => ({
    price_list_id: defaultPriceListId,
    variant_id: variantId,
    price: Math.max(0, Math.round(computeAdjustedPrice(priceMap.get(variantId) ?? 0, mode, value))),
  }));

  const updateResults = await Promise.all(
    chunkArray(updates, ID_BATCH_SIZE).map((batch) =>
      supabase.from("price_list_items").upsert(batch, { onConflict: "price_list_id,variant_id" })
    )
  );
  const error = updateResults.find((r) => r.error)?.error;

  if (error) {
    await setFlash("error", "Không thể cập nhật giá, vui lòng thử lại.");
    return;
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/");
  revalidatePath("/san-pham");
  await setFlash("success", `Đã cập nhật giá cho ${ids.length} sản phẩm (${variantIds.length} biến thể).`);
}

/**
 * Điều chỉnh nhanh tồn kho 1 biến thể ngay tại trang sản phẩm — ghi vào thẻ kho như mọi thay
 * đổi khác (loại "manual") nên vẫn giữ được lịch sử, chỉ là không cần tạo hẳn 1 phiếu nhập/kiểm
 * kho cho việc chỉnh nhanh 1 sản phẩm. Trả về số lượng mới để UI cập nhật ngay không cần tải lại
 * trang (được gọi trực tiếp từ client, không qua thẻ <form>).
 */
export async function adjustVariantStock(
  formData: FormData
): Promise<{ ok: boolean; quantity?: number; error?: string }> {
  const variantId = String(formData.get("variant_id") || "");
  const newQuantity = Number(formData.get("new_quantity"));

  if (!variantId || !Number.isFinite(newQuantity) || newQuantity < 0) {
    await setFlash("error", "Số lượng tồn kho không hợp lệ.");
    return { ok: false, error: "Số lượng không hợp lệ." };
  }

  const supabase = await createClient();
  const [defaultWarehouseId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    supabase.auth.getUser(),
  ]);

  if (!defaultWarehouseId) {
    await setFlash("error", "Cửa hàng chưa thiết lập kho mặc định.");
    return { ok: false, error: "Chưa có kho mặc định." };
  }

  const { data: stockRow } = await supabase
    .from("inventory_stock")
    .select("quantity")
    .eq("variant_id", variantId)
    .eq("warehouse_id", defaultWarehouseId)
    .maybeSingle();

  const currentQuantity = stockRow?.quantity ?? 0;
  const delta = newQuantity - currentQuantity;

  if (delta === 0) {
    return { ok: true, quantity: currentQuantity };
  }

  const result = await applyStockChange(supabase, {
    variantId,
    warehouseId: defaultWarehouseId,
    quantityChange: delta,
    changeType: "manual",
    referenceType: "manual_adjust",
    note: "Điều chỉnh tồn kho thủ công từ trang sản phẩm",
    createdBy: userResult.data.user?.id ?? null,
  });

  if (!result.ok) {
    const message = result.error || "Không thể cập nhật, số lượng sau điều chỉnh bị âm.";
    await setFlash("error", message);
    return { ok: false, error: message };
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/admin/kho/the-kho");
  revalidatePath("/admin/kho/gia-tri-ton-kho");
  revalidatePath("/");
  await setFlash("success", "Đã cập nhật tồn kho.");
  return { ok: true, quantity: result.balanceAfter };
}
