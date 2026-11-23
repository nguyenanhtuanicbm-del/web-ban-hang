"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/format";
import {
  applyStockChange,
  findOrCreateCustomer,
  getDefaultPriceListId,
  getDefaultWarehouseId,
} from "@/lib/stock";
import type { PaymentMethod } from "@/lib/types";

interface LineItem {
  variantId: string;
  quantity: number;
}

type VariantRow = { id: string; is_active: boolean; product: { name: string } | null };

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
  const phone = String(formData.get("phone") || "").trim();
  const paymentMethod = String(formData.get("payment_method") || "cash") as PaymentMethod;

  const supabase = await createClient();

  const [defaultWarehouseId, defaultPriceListId, userResult] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
    supabase.auth.getUser(),
  ]);
  if (!defaultWarehouseId || !defaultPriceListId) return;
  const createdBy = userResult.data.user?.id ?? null;

  const variantIds = [...new Set(items.map((i) => i.variantId))];

  const [{ data: variants }, { data: priceItems }, { data: stockRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, is_active, product:products(name)")
      .in("id", variantIds),
    supabase
      .from("price_list_items")
      .select("variant_id, price")
      .eq("price_list_id", defaultPriceListId)
      .in("variant_id", variantIds),
    supabase
      .from("inventory_stock")
      .select("variant_id, quantity")
      .eq("warehouse_id", defaultWarehouseId)
      .in("variant_id", variantIds),
  ]);
  if (!variants) return;

  const variantMap = new Map((variants as unknown as VariantRow[]).map((v) => [v.id, v]));
  const priceMap = new Map((priceItems ?? []).map((p) => [p.variant_id, p.price]));
  const stockMap = new Map((stockRows ?? []).map((s) => [s.variant_id, s.quantity]));

  let total = 0;
  const orderItemsToInsert: {
    variant_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const variant = variantMap.get(item.variantId);
    const quantity = Math.max(1, Math.floor(item.quantity || 0));
    const price = priceMap.get(item.variantId);
    const stock = stockMap.get(item.variantId) ?? 0;

    if (!variant || !variant.is_active || price === undefined || stock < quantity) continue;

    total += price * quantity;
    orderItemsToInsert.push({
      variant_id: item.variantId,
      product_name: variant.product?.name ?? "Sản phẩm",
      unit_price: price,
      quantity,
    });
  }

  if (orderItemsToInsert.length === 0) return;

  const customerId = await findOrCreateCustomer(supabase, { name: customerName, phone });
  const paidAmount = paymentMethod === "credit" ? 0 : total;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      code: generateOrderCode(),
      customer_id: customerId,
      customer_name: customerName,
      phone: phone || "—",
      status: "completed",
      source: "in_store",
      payment_method: paymentMethod,
      paid_amount: paidAmount,
      total,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !order) return;

  await supabase
    .from("order_items")
    .insert(orderItemsToInsert.map((i) => ({ ...i, order_id: order.id })));

  for (const item of orderItemsToInsert) {
    await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: defaultWarehouseId,
      quantityChange: -item.quantity,
      changeType: "sale",
      referenceType: "order",
      referenceId: order.id,
      createdBy,
    });
  }

  revalidatePath("/admin/don-hang");
  revalidatePath("/admin/san-pham");
  redirect(`/admin/don-hang/${order.id}`);
}
