export type OrderStatus = "new" | "processing" | "completed" | "cancelled";
export type PriceAdjustMode =
  | "percent_increase"
  | "percent_decrease"
  | "amount_increase"
  | "amount_decrease"
  | "set";
export type OrderSource = "online" | "in_store";
export type PaymentMethod = "cash" | "card" | "transfer" | "credit";
export type PurchaseOrderStatus = "draft" | "received" | "cancelled";
export type StockCountStatus = "draft" | "completed";
export type StockTransferStatus = "draft" | "completed";
export type StockChangeType =
  | "purchase"
  | "sale"
  | "sale_return"
  | "transfer_out"
  | "transfer_in"
  | "count_adjustment"
  | "manual";

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  variants?: Variant[];
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, string>;
  cost_price: number;
  low_stock_threshold: number;
  unit: string;
  track_lot: boolean;
  track_serial: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: Product;
  /** Giá bán lẻ (bảng giá mặc định) — gắn vào khi query kèm join, không phải cột DB. */
  price?: number;
  /** Tổng tồn kho mọi kho — gắn vào khi query kèm join, không phải cột DB. */
  total_stock?: number;
}

/** Các đơn vị tính thường dùng cho sản phẩm bán lẻ — chọn nhanh khi tạo biến thể. */
export const UNIT_OPTIONS = ["Cái", "Kg", "Mét", "Cây", "Bịch"];

export interface PriceList {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  variant_id: string;
  price: number;
}

export interface Warehouse {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface InventoryStock {
  id: string;
  variant_id: string;
  warehouse_id: string;
  quantity: number;
  variant?: Variant;
  warehouse?: Warehouse;
}

export interface StockLedgerEntry {
  id: string;
  variant_id: string;
  warehouse_id: string;
  change_type: StockChangeType;
  quantity_change: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  variant?: Variant & { product?: Product };
  warehouse?: Warehouse;
}

export interface StockLot {
  id: string;
  variant_id: string;
  warehouse_id: string;
  lot_code: string;
  expiry_date: string | null;
  quantity: number;
  cost_price: number;
  received_at: string;
}

export interface StockSerial {
  id: string;
  variant_id: string;
  warehouse_id: string | null;
  serial_no: string;
  status: "in_stock" | "sold" | "returned";
  lot_id: string | null;
  order_item_id: string | null;
  received_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  quantity: number;
  unit_cost: number;
  lot_code: string | null;
  expiry_date: string | null;
  variant?: Variant & { product?: Product };
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplier_id: string | null;
  warehouse_id: string;
  status: PurchaseOrderStatus;
  other_cost: number;
  total_amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  received_at: string | null;
  supplier?: Supplier | null;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  variant_id: string;
  system_quantity: number;
  counted_quantity: number;
  variant?: Variant & { product?: Product };
}

export interface StockCount {
  id: string;
  code: string;
  warehouse_id: string;
  status: StockCountStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  warehouse?: Warehouse;
  items?: StockCountItem[];
}

export interface StockTransferItem {
  id: string;
  stock_transfer_id: string;
  variant_id: string;
  quantity: number;
  variant?: Variant & { product?: Product };
}

export interface StockTransfer {
  id: string;
  code: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: StockTransferStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  items?: StockTransferItem[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  variant?: Variant;
}

export interface Order {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  address: string | null;
  note: string | null;
  status: OrderStatus;
  source: OrderSource;
  payment_method: PaymentMethod;
  paid_amount: number;
  total: number;
  created_by: string | null;
  created_at: string;
  customer?: Customer | null;
  items?: OrderItem[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Mới",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  card: "Quẹt thẻ",
  transfer: "Chuyển khoản",
  credit: "Bán chịu (ghi công nợ)",
};

export function formatVariantAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function variantDisplayName(productName: string, attributes: Record<string, string>): string {
  const attrText = formatVariantAttributes(attributes);
  return attrText ? `${productName} (${attrText})` : productName;
}
