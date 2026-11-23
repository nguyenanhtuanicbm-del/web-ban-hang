"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWarehouse(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("warehouses").insert({ name });
  revalidatePath("/admin/kho/kho-hang");
}

export async function renameWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  await supabase.from("warehouses").update({ name }).eq("id", id);
  revalidatePath("/admin/kho/kho-hang");
}

export async function setDefaultWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("warehouses").update({ is_default: false }).neq("id", id);
  await supabase.from("warehouses").update({ is_default: true }).eq("id", id);
  revalidatePath("/admin/kho/kho-hang");
}

export async function deleteWarehouse(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("warehouses").delete().eq("id", id);
  revalidatePath("/admin/kho/kho-hang");
}
