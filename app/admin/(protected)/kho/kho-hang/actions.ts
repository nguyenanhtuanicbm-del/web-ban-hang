"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export async function createWarehouse(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    await setFlash("error", "Vui lòng nhập tên kho.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").insert({ name });

  if (error) {
    await setFlash("error", "Không thể tạo kho.");
    return;
  }

  revalidatePath("/admin/kho/kho-hang");
  await setFlash("success", `Đã thêm kho "${name}".`);
}

export async function renameWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) {
    await setFlash("error", "Vui lòng nhập tên kho.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").update({ name }).eq("id", id);

  if (error) {
    await setFlash("error", "Không thể lưu tên kho.");
    return;
  }

  revalidatePath("/admin/kho/kho-hang");
  await setFlash("success", "Đã lưu tên kho.");
}

export async function setDefaultWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã kho.");
    return;
  }

  const supabase = await createClient();
  await supabase.from("warehouses").update({ is_default: false }).neq("id", id);
  const { error } = await supabase.from("warehouses").update({ is_default: true }).eq("id", id);

  if (error) {
    await setFlash("error", "Không thể đặt kho mặc định.");
    return;
  }

  revalidatePath("/admin/kho/kho-hang");
  await setFlash("success", "Đã đặt làm kho mặc định.");
}

export async function deleteWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã kho.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").delete().eq("id", id);

  if (error) {
    await setFlash(
      "error",
      error.code === "23503"
        ? "Không thể xóa kho đã có lịch sử nhập/xuất hàng."
        : "Không thể xóa kho."
    );
    return;
  }

  revalidatePath("/admin/kho/kho-hang");
  await setFlash("success", "Đã xóa kho.");
}
