"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productName: string;
  /** Mô tả thuộc tính biến thể, ví dụ "Size: M, Màu: Đỏ" — rỗng nếu sản phẩm không có biến thể. */
  variantLabel: string;
  slug: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  unit: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (variantId) =>
        set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      updateQuantity: (variantId, quantity) =>
        set({
          items: get().items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-storage" }
  )
);

/**
 * localStorage chỉ có ở client nên state giỏ hàng "rehydrate" sau lần render đầu.
 * Dùng useSyncExternalStore (thay vì effect + setState) để tránh mismatch SSR/client
 * mà không gây render-chồng-render.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useCartStore.persist.onFinishHydration(callback),
    () => useCartStore.persist.hasHydrated(),
    () => false
  );
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
