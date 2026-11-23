"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";

interface TransferItemInput {
  variantId: string;
  quantity: number;
}

export async function createStockTransfer(formData: FormData) {
  const fromWarehouseId = String(formData.get("from_warehouse_id") || "");
  const toWarehouseId = String(formData.get("to_warehouse_id") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) return;

  let items: TransferItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items_json") || "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.variantId && i.quantity > 0);
  if (items.length === 0) return;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  const { data: transfer, error } = await supabase
    .from("stock_transfers")
    .insert({
      code: generateCode("DC"),
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      status: "draft",
      note,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !transfer) return;

  await supabase.from("stock_transfer_items").insert(
    items.map((i) => ({
      stock_transfer_id: transfer.id,
      variant_id: i.variantId,
      quantity: i.quantity,
    }))
  );

  revalidatePath("/admin/kho/dieu-chuyen");
  redirect(`/admin/kho/dieu-chuyen/${transfer.id}`);
}

export async function completeStockTransfer(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  const { data: transfer } = await supabase.from("stock_transfers").select("*").eq("id", id).single();
  if (!transfer || transfer.status !== "draft") return;

  const { data: items } = await supabase
    .from("stock_transfer_items")
    .select("*")
    .eq("stock_transfer_id", id);
  if (!items) return;

  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  for (const item of items) {
    const outResult = await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: transfer.from_warehouse_id,
      quantityChange: -item.quantity,
      changeType: "transfer_out",
      referenceType: "stock_transfer",
      referenceId: transfer.id,
      note: `Chuyển đến kho khác — phiếu ${transfer.code}`,
      createdBy,
    });

    if (!outResult.ok) continue;

    await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: transfer.to_warehouse_id,
      quantityChange: item.quantity,
      changeType: "transfer_in",
      referenceType: "stock_transfer",
      referenceId: transfer.id,
      note: `Nhận từ kho khác — phiếu ${transfer.code}`,
      createdBy,
    });
  }

  await supabase
    .from("stock_transfers")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  revalidatePath("/admin/kho/dieu-chuyen");
  revalidatePath(`/admin/kho/dieu-chuyen/${id}`);
  revalidatePath("/admin/san-pham");
}
