"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

function parseFields(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    note: String(formData.get("note") || "").trim() || null,
  };
}

export async function createSupplier(formData: FormData) {
  const fields = parseFields(formData);
  if (!fields.name) {
    await setFlash("error", "Vui lòng nhập tên nhà cung cấp.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert(fields);

  if (error) {
    await setFlash("error", "Không thể thêm nhà cung cấp.");
    return;
  }

  revalidatePath("/admin/kho/nha-cung-cap");
  await setFlash("success", `Đã thêm nhà cung cấp "${fields.name}".`);
}

export async function updateSupplier(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fields = parseFields(formData);
  if (!id || !fields.name) {
    await setFlash("error", "Vui lòng nhập tên nhà cung cấp.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(fields).eq("id", id);

  if (error) {
    await setFlash("error", "Không thể lưu thông tin nhà cung cấp.");
    return;
  }

  revalidatePath("/admin/kho/nha-cung-cap");
  await setFlash("success", `Đã lưu thông tin nhà cung cấp "${fields.name}".`);
}

export async function deleteSupplier(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã nhà cung cấp.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    await setFlash("error", "Không thể xóa nhà cung cấp.");
    return;
  }

  revalidatePath("/admin/kho/nha-cung-cap");
  await setFlash("success", "Đã xóa nhà cung cấp.");
}
