"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/format";

interface LineItem {
  productId: string;
  quantity: number;
}

export async function createInStoreOrder(formData: FormData) {
  const itemsJson = String(formData.get("items_json") || "[]");
  let items: LineItem[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return;
  }
  if (!Array.isArray(items) || items.length === 0) return;

  const customerName = String(formData.get("customer_name") || "").trim() || "Khách lẻ";
  const phone = String(formData.get("phone") || "").trim() || "—";

  const supabase = await createClient();

  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .in("id", productIds);

  if (!products) return;

  const productMap = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const orderItemsToInsert: {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    const quantity = Math.max(1, Math.floor(item.quantity || 0));
    if (!product || product.stock < quantity) continue;

    total += product.price * quantity;
    orderItemsToInsert.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
    });
  }

  if (orderItemsToInsert.length === 0) return;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      code: generateOrderCode(),
      customer_name: customerName,
      phone,
      status: "completed",
      source: "in_store",
      total,
    })
    .select()
    .single();

  if (error || !order) return;

  await supabase
    .from("order_items")
    .insert(orderItemsToInsert.map((i) => ({ ...i, order_id: order.id })));

  for (const item of orderItemsToInsert) {
    const product = productMap.get(item.product_id)!;
    await supabase
      .from("products")
      .update({ stock: product.stock - item.quantity })
      .eq("id", item.product_id)
      .gte("stock", item.quantity);
  }

  revalidatePath("/admin/don-hang");
  revalidatePath("/admin/san-pham");
  redirect(`/admin/don-hang/${order.id}`);
}
