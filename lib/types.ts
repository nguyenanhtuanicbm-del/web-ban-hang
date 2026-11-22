export type OrderStatus = "new" | "processing" | "completed" | "cancelled";
export type OrderSource = "online" | "in_store";

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
  price: number;
  compare_at_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  address: string | null;
  note: string | null;
  status: OrderStatus;
  source: OrderSource;
  total: number;
  created_at: string;
  items?: OrderItem[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Mới",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
