"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("customers").insert(fields);
  revalidatePath("/admin/khach-hang");
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fields = parseFields(formData);
  if (!id || !fields.name) return;

  const supabase = await createClient();
  await supabase.from("customers").update(fields).eq("id", id);
  revalidatePath("/admin/khach-hang");
}

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/admin/khach-hang");
}
