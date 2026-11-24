import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockChangeType } from "@/lib/types";

export async function getDefaultWarehouseId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("warehouses").select("id").eq("is_default", true).maybeSingle();
  return data?.id ?? null;
}

export async function getDefaultPriceListId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("price_lists").select("id").eq("is_default", true).maybeSingle();
  return data?.id ?? null;
}

/**
 * Cộng/trừ tồn kho 1 biến thể tại 1 kho + ghi 1 dòng thẻ kho (stock_ledger).
 * quantityChange âm = xuất (bán, chuyển đi...), dương = nhập (nhập hàng, chuyển đến...).
 * Trả về ok=false nếu trừ kho sẽ làm tồn âm — nơi gọi tự quyết định huỷ giao dịch.
 *
 * Dùng .eq("quantity", currentQuantity) khi update để giảm rủi ro ghi đè khi có
 * 2 giao dịch cùng lúc — chấp nhận đơn giản hoá (không retry) vì quy mô 1 cửa
 * hàng, lưu lượng thấp.
 */
export async function applyStockChange(
  supabase: SupabaseClient,
  params: {
    variantId: string;
    warehouseId: string;
    quantityChange: number;
    changeType: StockChangeType;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    createdBy?: string | null;
  }
): Promise<{ ok: boolean; balanceAfter: number; error?: string }> {
  const { data: existing } = await supabase
    .from("inventory_stock")
    .select("id, quantity")
    .eq("variant_id", params.variantId)
    .eq("warehouse_id", params.warehouseId)
    .maybeSingle();

  const currentQuantity = existing?.quantity ?? 0;
  const newQuantity = currentQuantity + params.quantityChange;

  if (newQuantity < 0) {
    return { ok: false, balanceAfter: currentQuantity };
  }

  if (existing) {
    const { data: updated, error } = await supabase
      .from("inventory_stock")
      .update({ quantity: newQuantity })
      .eq("id", existing.id)
      .eq("quantity", currentQuantity)
      .select("id");

    if (error) {
      console.error("applyStockChange: lỗi cập nhật inventory_stock:", error);
      return { ok: false, balanceAfter: currentQuantity, error: error.message };
    }
    if (!updated || updated.length === 0) {
      console.error("applyStockChange: update không khớp dòng nào (tồn kho vừa bị thay đổi bởi thao tác khác)");
      return {
        ok: false,
        balanceAfter: currentQuantity,
        error: "Tồn kho vừa được thay đổi bởi thao tác khác, vui lòng tải lại trang và thử lại.",
      };
    }
  } else {
    const { error } = await supabase.from("inventory_stock").insert({
      variant_id: params.variantId,
      warehouse_id: params.warehouseId,
      quantity: newQuantity,
    });
    if (error) {
      console.error("applyStockChange: lỗi thêm inventory_stock:", error);
      return { ok: false, balanceAfter: currentQuantity, error: error.message };
    }
  }

  const { error: ledgerError } = await supabase.from("stock_ledger").insert({
    variant_id: params.variantId,
    warehouse_id: params.warehouseId,
    change_type: params.changeType,
    quantity_change: params.quantityChange,
    balance_after: newQuantity,
    reference_type: params.referenceType ?? null,
    reference_id: params.referenceId ?? null,
    note: params.note ?? null,
    created_by: params.createdBy ?? null,
  });
  if (ledgerError) {
    console.error("applyStockChange: lỗi ghi stock_ledger:", ledgerError);
  }

  return { ok: true, balanceAfter: newQuantity };
}

/** Tìm khách theo số điện thoại, tạo mới nếu chưa có. Trả về null nếu không có số điện thoại. */
export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  params: { name: string; phone?: string | null; address?: string | null }
): Promise<string | null> {
  const phone = params.phone?.trim();
  if (!phone) return null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("customers")
    .insert({ name: params.name.trim(), phone, address: params.address?.trim() || null })
    .select("id")
    .single();

  return created?.id ?? null;
}
