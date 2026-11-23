"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";
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
