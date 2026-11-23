"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { setFlash } from "@/lib/flash";

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    await setFlash("error", "Vui lòng nhập tên danh mục.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name, slug: slugify(name) });

  if (error) {
    await setFlash(
      "error",
      error.code === "23505" ? "Danh mục này đã tồn tại." : "Không thể tạo danh mục."
    );
    return;
  }

  revalidatePath("/admin/danh-muc");
  await setFlash("success", `Đã thêm danh mục "${name}".`);
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) {
    await setFlash("error", "Vui lòng nhập tên danh mục.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, slug: slugify(name) })
    .eq("id", id);

  if (error) {
    await setFlash(
      "error",
      error.code === "23505" ? "Tên danh mục này đã tồn tại." : "Không thể lưu danh mục."
    );
    return;
  }

  revalidatePath("/admin/danh-muc");
  await setFlash("success", `Đã lưu danh mục "${name}".`);
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    await setFlash("error", "Thiếu mã danh mục.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    await setFlash("error", "Không thể xóa danh mục.");
    return;
  }

  revalidatePath("/admin/danh-muc");
  await setFlash("success", "Đã xóa danh mục.");
}
