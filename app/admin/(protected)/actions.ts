"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await setFlash("success", "Đã đăng xuất.");
  redirect("/admin/login");
}
