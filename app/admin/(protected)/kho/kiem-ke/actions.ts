"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";

interface CountItemInput {
  variantId: string;
  systemQuantity: number;
  countedQuantity: number;
}

export async function createStockCount(formData: FormData) {
  const warehouseId = String(formData.get("warehouse_id") || "");
  if (!warehouseId) return;

  let items: CountItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items_json") || "[]"));
  } catch {
    return;
  }
  if (items.length === 0) return;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  const { data: count, error } = await supabase
    .from("stock_counts")
    .insert({ code: generateCode("KK"), warehouse_id: warehouseId, status: "draft", created_by: createdBy })
    .select()
    .single();

  if (error || !count) return;

  await supabase.from("stock_count_items").insert(
    items.map((i) => ({
      stock_count_id: count.id,
      variant_id: i.variantId,
      system_quantity: i.systemQuantity,
      counted_quantity: i.countedQuantity,
    }))
  );

  revalidatePath("/admin/kho/kiem-ke");
  redirect(`/admin/kho/kiem-ke/${count.id}`);
}

export async function completeStockCount(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  const { data: count } = await supabase.from("stock_counts").select("*").eq("id", id).single();
  if (!count || count.status !== "draft") return;

  const { data: items } = await supabase
    .from("stock_count_items")
    .select("*")
    .eq("stock_count_id", id);
  if (!items) return;

  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  for (const item of items) {
    const diff = item.counted_quantity - item.system_quantity;
    if (diff === 0) continue;

    await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: count.warehouse_id,
      quantityChange: diff,
      changeType: "count_adjustment",
      referenceType: "stock_count",
      referenceId: count.id,
      note: `Điều chỉnh theo phiếu kiểm kho ${count.code}`,
      createdBy,
    });
  }

  await supabase
    .from("stock_counts")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  revalidatePath("/admin/kho/kiem-ke");
  revalidatePath(`/admin/kho/kiem-ke/${id}`);
  revalidatePath("/admin/san-pham");
}
