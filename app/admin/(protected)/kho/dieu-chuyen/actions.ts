"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";
import { setFlash } from "@/lib/flash";

interface TransferItemInput {
  variantId: string;
  quantity: number;
}

export async function createStockTransfer(formData: FormData) {
  const fromWarehouseId = String(formData.get("from_warehouse_id") || "");
  const toWarehouseId = String(formData.get("to_warehouse_id") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!fromWarehouseId || !toWarehouseId) {
    await setFlash("error", "Vui lòng chọn kho nguồn và kho đích.");
    return;
  }
  if (fromWarehouseId === toWarehouseId) {
    await setFlash("error", "Kho nguồn và kho đích phải khác nhau.");
    return;
  }

  let items: TransferItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items_json") || "[]"));
  } catch {
    await setFlash("error", "Dữ liệu sản phẩm không hợp lệ.");
    return;
  }
  items = items.filter((i) => i.variantId && i.quantity > 0);
  if (items.length === 0) {
    await setFlash("error", "Vui lòng thêm ít nhất 1 sản phẩm để điều chuyển.");
    return;
  }

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

  if (error || !transfer) {
    await setFlash("error", "Không thể tạo phiếu điều chuyển, vui lòng thử lại.");
    return;
  }

  await supabase.from("stock_transfer_items").insert(
    items.map((i) => ({
      stock_transfer_id: transfer.id,
      variant_id: i.variantId,
      quantity: i.quantity,
    }))
  );

  revalidatePath("/admin/kho/dieu-chuyen");
  await setFlash("success", `Đã tạo phiếu điều chuyển ${transfer.code}.`);
  redirect(`/admin/kho/dieu-chuyen/${transfer.id}`);
}

export async function completeStockTransfer(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã phiếu điều chuyển.");
    return;
  }

  const supabase = await createClient();
  const { data: transfer } = await supabase.from("stock_transfers").select("*").eq("id", id).single();
  if (!transfer || transfer.status !== "draft") {
    await setFlash("error", "Phiếu điều chuyển không ở trạng thái nháp, không thể hoàn tất.");
    return;
  }

  const { data: items } = await supabase
    .from("stock_transfer_items")
    .select("*")
    .eq("stock_transfer_id", id);
  if (!items) {
    await setFlash("error", "Phiếu điều chuyển không có sản phẩm nào.");
    return;
  }

  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  let skipped = 0;

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

    if (!outResult.ok) {
      skipped += 1;
      continue;
    }

    const inResult = await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: transfer.to_warehouse_id,
      quantityChange: item.quantity,
      changeType: "transfer_in",
      referenceType: "stock_transfer",
      referenceId: transfer.id,
      note: `Nhận từ kho khác — phiếu ${transfer.code}`,
      createdBy,
    });
    if (!inResult.ok) skipped += 1;
  }

  await supabase
    .from("stock_transfers")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  revalidatePath("/admin/kho/dieu-chuyen");
  revalidatePath(`/admin/kho/dieu-chuyen/${id}`);
  revalidatePath("/admin/san-pham");

  if (skipped > 0) {
    await setFlash(
      "error",
      `Đã hoàn tất điều chuyển ${transfer.code}, nhưng ${skipped} sản phẩm bị bỏ qua do kho nguồn không đủ tồn.`
    );
  } else {
    await setFlash("success", `Đã hoàn tất điều chuyển ${transfer.code}.`);
  }
}
