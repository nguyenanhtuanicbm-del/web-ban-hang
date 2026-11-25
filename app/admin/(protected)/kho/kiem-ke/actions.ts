"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";
import { setFlash } from "@/lib/flash";

interface CountItemInput {
  variantId: string;
  systemQuantity: number;
  countedQuantity: number;
}

export async function createStockCount(formData: FormData) {
  const warehouseId = String(formData.get("warehouse_id") || "");
  if (!warehouseId) {
    await setFlash("error", "Vui lòng chọn kho cần kiểm.");
    return;
  }

  let items: CountItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items_json") || "[]"));
  } catch {
    await setFlash("error", "Dữ liệu kiểm kho không hợp lệ.");
    return;
  }
  if (items.length === 0) {
    await setFlash("error", "Không có sản phẩm nào để kiểm kho.");
    return;
  }

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  const { data: count, error } = await supabase
    .from("stock_counts")
    .insert({ code: generateCode("KK"), warehouse_id: warehouseId, status: "draft", created_by: createdBy })
    .select()
    .single();

  if (error || !count) {
    await setFlash("error", "Không thể tạo phiếu kiểm kho, vui lòng thử lại.");
    return;
  }

  await supabase.from("stock_count_items").insert(
    items.map((i) => ({
      stock_count_id: count.id,
      variant_id: i.variantId,
      system_quantity: i.systemQuantity,
      counted_quantity: i.countedQuantity,
    }))
  );

  revalidatePath("/admin/kho/kiem-ke");
  await setFlash("success", `Đã tạo phiếu kiểm kho ${count.code}.`);
  redirect(`/admin/kho/kiem-ke/${count.id}`);
}

export async function completeStockCount(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã phiếu kiểm kho.");
    return;
  }

  const supabase = await createClient();
  const { data: count } = await supabase.from("stock_counts").select("*").eq("id", id).single();
  if (!count || count.status !== "draft") {
    await setFlash("error", "Phiếu kiểm kho không ở trạng thái nháp, không thể hoàn tất.");
    return;
  }

  const { data: items } = await supabase
    .from("stock_count_items")
    .select("*")
    .eq("stock_count_id", id);
  if (!items) {
    await setFlash("error", "Phiếu kiểm kho không có dữ liệu.");
    return;
  }

  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  let stockWarnings = 0;

  for (const item of items) {
    const diff = item.counted_quantity - item.system_quantity;
    if (diff === 0) continue;

    const stockResult = await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: count.warehouse_id,
      quantityChange: diff,
      changeType: "count_adjustment",
      referenceType: "stock_count",
      referenceId: count.id,
      note: `Điều chỉnh theo phiếu kiểm kho ${count.code}`,
      createdBy,
    });
    if (!stockResult.ok) stockWarnings += 1;
  }

  await supabase
    .from("stock_counts")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  revalidatePath("/admin/kho/kiem-ke");
  revalidatePath(`/admin/kho/kiem-ke/${id}`);
  revalidatePath("/admin/san-pham");
  await setFlash(
    "success",
    `Đã hoàn tất kiểm kho ${count.code}, tồn kho đã được điều chỉnh.` +
      (stockWarnings > 0
        ? ` (${stockWarnings} sản phẩm không cập nhật được tồn kho, vui lòng kiểm tra lại.)`
        : "")
  );
}
