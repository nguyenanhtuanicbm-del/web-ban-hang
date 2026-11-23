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

export async function createSupplier(formData: FormData) {
  const fields = parseFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("suppliers").insert(fields);
  revalidatePath("/admin/kho/nha-cung-cap");
}

export async function updateSupplier(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fields = parseFields(formData);
  if (!id || !fields.name) return;

  const supabase = await createClient();
  await supabase.from("suppliers").update(fields).eq("id", id);
  revalidatePath("/admin/kho/nha-cung-cap");
}

export async function deleteSupplier(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("suppliers").delete().eq("id", id);
  revalidatePath("/admin/kho/nha-cung-cap");
}
