import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderCode } from "@/lib/format";
import { applyStockChange, findOrCreateCustomer, getDefaultPriceListId, getDefaultWarehouseId } from "@/lib/stock";

interface OrderItemInput {
  variantId: string;
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

  const [defaultWarehouseId, defaultPriceListId] = await Promise.all([
    getDefaultWarehouseId(supabase),
    getDefaultPriceListId(supabase),
  ]);

  if (!defaultWarehouseId || !defaultPriceListId) {
    return NextResponse.json(
      { error: "Cửa hàng chưa thiết lập kho/bảng giá mặc định." },
      { status: 500 }
    );
  }

  const variantIds = [...new Set(items.map((i) => i.variantId))];

  const [{ data: variants, error: variantsError }, { data: priceItems }, { data: stockRows }] =
    await Promise.all([
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

  if (variantsError || !variants) {
    return NextResponse.json({ error: "Không thể xác thực sản phẩm." }, { status: 500 });
  }

  type VariantRow = { id: string; is_active: boolean; product: { name: string } | null };
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

    if (!variant || !variant.is_active || price === undefined) {
      return NextResponse.json({ error: "Có sản phẩm không tồn tại hoặc đã bị ẩn." }, { status: 400 });
    }
    if (stock < quantity) {
      return NextResponse.json(
        { error: `Sản phẩm "${variant.product?.name}" chỉ còn ${stock} trong kho.` },
        { status: 400 }
      );
    }

    total += price * quantity;
    orderItemsToInsert.push({
      variant_id: item.variantId,
      product_name: variant.product?.name ?? "Sản phẩm",
      unit_price: price,
      quantity,
    });
  }

  const customerId = await findOrCreateCustomer(supabase, {
    name: customerName,
    phone,
    address,
  });

  const code = generateOrderCode();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      code,
      customer_id: customerId,
      customer_name: customerName.trim(),
      phone: phone.trim(),
      address: address?.trim() || null,
      note: note?.trim() || null,
      status: "new",
      source: "online",
      payment_method: "cash",
      paid_amount: 0,
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
    await applyStockChange(supabase, {
      variantId: item.variant_id,
      warehouseId: defaultWarehouseId,
      quantityChange: -item.quantity,
      changeType: "sale",
      referenceType: "order",
      referenceId: order.id,
    });
  }

  return NextResponse.json({ code: order.code, orderId: order.id });
}
