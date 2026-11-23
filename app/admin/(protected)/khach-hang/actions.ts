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

export async function createCustomer(formData: FormData) {
  const fields = parseFields(formData);
  if (!fields.name) {
    await setFlash("error", "Vui lòng nhập tên khách hàng.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert(fields);

  if (error) {
    await setFlash("error", "Không thể thêm khách hàng.");
    return;
  }

  revalidatePath("/admin/khach-hang");
  await setFlash("success", `Đã thêm khách hàng "${fields.name}".`);
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fields = parseFields(formData);
  if (!id || !fields.name) {
    await setFlash("error", "Vui lòng nhập tên khách hàng.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(fields).eq("id", id);

  if (error) {
    await setFlash("error", "Không thể lưu thông tin khách hàng.");
    return;
  }

  revalidatePath("/admin/khach-hang");
  await setFlash("success", `Đã lưu thông tin khách hàng "${fields.name}".`);
}

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã khách hàng.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    await setFlash("error", "Không thể xóa khách hàng.");
    return;
  }

  revalidatePath("/admin/khach-hang");
  await setFlash("success", "Đã xóa khách hàng.");
}
