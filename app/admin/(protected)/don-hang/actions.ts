"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";
import { applyStockChange, getDefaultWarehouseId } from "@/lib/stock";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as OrderStatus;
  if (!id || !status) {
    await setFlash("error", "Thiếu thông tin đơn hàng.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);

  if (error) {
    await setFlash("error", "Không thể cập nhật trạng thái đơn hàng.");
    return;
  }

  revalidatePath("/admin/don-hang");
  revalidatePath(`/admin/don-hang/${id}`);
  await setFlash("success", `Đã cập nhật trạng thái: ${ORDER_STATUS_LABEL[status]}.`);
}

export async function cancelOrder(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã đơn hàng.");
    return;
  }

  const supabase = await createClient();

  const [{ data: order }, { data: items }, userResult] = await Promise.all([
    supabase.from("orders").select("id, code, status").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("variant_id, quantity").eq("order_id", id),
    supabase.auth.getUser(),
  ]);

  if (!order) {
    await setFlash("error", "Không tìm thấy đơn hàng.");
    return;
  }
  if (order.status === "cancelled") {
    await setFlash("error", "Đơn hàng này đã được hủy trước đó.");
    return;
  }

  const defaultWarehouseId = await getDefaultWarehouseId(supabase);
  const createdBy = userResult.data.user?.id ?? null;

  if (defaultWarehouseId) {
    for (const item of items ?? []) {
      if (!item.variant_id) continue;
      await applyStockChange(supabase, {
        variantId: item.variant_id,
        warehouseId: defaultWarehouseId,
        quantityChange: item.quantity,
        changeType: "sale_return",
        referenceType: "order_cancel",
        referenceId: order.id,
        note: `Hoàn kho do hủy đơn ${order.code}`,
        createdBy,
      });
    }
  }

  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (error) {
    await setFlash("error", "Không thể hủy đơn hàng, vui lòng thử lại.");
    return;
  }

  revalidatePath("/admin/don-hang");
  revalidatePath(`/admin/don-hang/${id}`);
  revalidatePath("/admin/san-pham");
  await setFlash("success", `Đã hủy đơn hàng ${order.code} và hoàn lại tồn kho.`);
}
