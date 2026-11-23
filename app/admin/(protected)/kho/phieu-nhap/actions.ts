"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";
import { setFlash } from "@/lib/flash";

interface PoItemInput {
  variantId: string;
  quantity: number;
  unitCost: number;
  lotCode?: string;
  expiryDate?: string;
}

export async function createPurchaseOrder(formData: FormData) {
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const warehouseId = String(formData.get("warehouse_id") || "");
  const otherCost = Number(formData.get("other_cost") || 0) || 0;
  const note = String(formData.get("note") || "").trim() || null;

  let items: PoItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items_json") || "[]"));
  } catch {
    await setFlash("error", "Dữ liệu sản phẩm không hợp lệ.");
    return;
  }
  items = items.filter((i) => i.variantId && i.quantity > 0 && i.unitCost >= 0);

  if (!warehouseId) {
    await setFlash("error", "Vui lòng chọn kho nhập.");
    return;
  }
  if (items.length === 0) {
    await setFlash("error", "Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập.");
    return;
  }

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0) + otherCost;

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      code: generateCode("PN"),
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      status: "draft",
      other_cost: otherCost,
      total_amount: totalAmount,
      note,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !po) {
    await setFlash("error", "Không thể tạo phiếu nhập, vui lòng thử lại.");
    return;
  }

  await supabase.from("purchase_order_items").insert(
    items.map((i) => ({
      purchase_order_id: po.id,
      variant_id: i.variantId,
      quantity: i.quantity,
      unit_cost: i.unitCost,
      lot_code: i.lotCode?.trim() || null,
      expiry_date: i.expiryDate || null,
    }))
  );

  revalidatePath("/admin/kho/phieu-nhap");
  await setFlash("success", `Đã tạo phiếu nhập ${po.code}.`);
  redirect(`/admin/kho/phieu-nhap/${po.id}`);
}

export async function receivePurchaseOrder(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã phiếu nhập.");
    return;
  }

  const supabase = await createClient();

  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!po || po.status !== "draft") {
    await setFlash("error", "Phiếu nhập không ở trạng thái nháp, không thể nhận hàng.");
    return;
  }

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id);
  if (!items || items.length === 0) {
    await setFlash("error", "Phiếu nhập không có sản phẩm nào.");
    return;
  }

  const { data: userResult } = await supabase.auth.getUser();
  const createdBy = userResult.user?.id ?? null;

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  for (const item of items) {
    const share = subtotal > 0 ? (item.quantity * item.unit_cost) / subtotal : 1 / items.length;
    const allocatedOtherCost = Number(po.other_cost) * share;
    const landedUnitCost = (item.quantity * item.unit_cost + allocatedOtherCost) / item.quantity;

    const [{ data: variant }, { data: stockTotal }] = await Promise.all([
      supabase.from("product_variants").select("cost_price").eq("id", item.variant_id).single(),
      supabase
        .from("variant_total_stock")
        .select("total_quantity")
        .eq("variant_id", item.variant_id)
        .maybeSingle(),
    ]);

    const currentStock = stockTotal?.total_quantity ?? 0;
    const currentCost = variant?.cost_price ?? 0;
    const newAvgCost =
      currentStock + item.quantity > 0
        ? (currentStock * currentCost + item.quantity * landedUnitCost) / (currentStock + item.quantity)
        : landedUnitCost;

    await supabase
      .from("product_variants")
      .update({ cost_price: newAvgCost })
      .eq("id", item.variant_id);

    await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: po.warehouse_id,
      quantityChange: item.quantity,
      changeType: "purchase",
      referenceType: "purchase_order",
      referenceId: po.id,
      note: `Nhập từ phiếu ${po.code}`,
      createdBy,
    });

    if (item.lot_code) {
      await supabase.from("stock_lots").insert({
        variant_id: item.variant_id,
        warehouse_id: po.warehouse_id,
        lot_code: item.lot_code,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        cost_price: landedUnitCost,
      });
    }
  }

  await supabase
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  revalidatePath("/admin/kho/phieu-nhap");
  revalidatePath(`/admin/kho/phieu-nhap/${id}`);
  revalidatePath("/admin/san-pham");
  await setFlash("success", `Đã nhận hàng cho phiếu ${po.code}, tồn kho và giá vốn đã cập nhật.`);
}

export async function cancelPurchaseOrder(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã phiếu nhập.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "draft");

  if (error) {
    await setFlash("error", "Không thể hủy phiếu nhập.");
    return;
  }

  revalidatePath("/admin/kho/phieu-nhap");
  revalidatePath(`/admin/kho/phieu-nhap/${id}`);
  await setFlash("success", "Đã hủy phiếu nhập.");
}
