import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderCode } from "@/lib/format";

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  let body: {
    customerName?: string;
    phone?: string;
    address?: string;
    note?: string;
    items?: OrderItemInput[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { customerName, phone, address, note, items } = body;

  if (!customerName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Vui lòng nhập họ tên và số điện thoại." }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Giỏ hàng trống." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock, is_active")
    .in("id", productIds);

  if (productsError || !products) {
    return NextResponse.json({ error: "Không thể xác thực sản phẩm." }, { status: 500 });
  }

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

    if (!product || !product.is_active) {
      return NextResponse.json({ error: "Có sản phẩm không tồn tại hoặc đã bị ẩn." }, { status: 400 });
    }
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho.` },
        { status: 400 }
      );
    }

    total += product.price * quantity;
    orderItemsToInsert.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
    });
  }

  const code = generateOrderCode();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      code,
      customer_name: customerName.trim(),
      phone: phone.trim(),
      address: address?.trim() || null,
      note: note?.trim() || null,
      status: "new",
      source: "online",
      total,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Không thể tạo đơn hàng." }, { status: 500 });
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsToInsert.map((i) => ({ ...i, order_id: order.id })));

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Không thể tạo đơn hàng." }, { status: 500 });
  }

  for (const item of orderItemsToInsert) {
    const product = productMap.get(item.product_id)!;
    await supabase
      .from("products")
      .update({ stock: product.stock - item.quantity })
      .eq("id", item.product_id)
      .gte("stock", item.quantity);
  }

  return NextResponse.json({ code: order.code, orderId: order.id });
}
