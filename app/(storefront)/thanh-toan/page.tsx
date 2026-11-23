"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore, useCartHydrated, cartTotal } from "@/store/cart";
import { formatVND } from "@/lib/format";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const hydrated = useCartHydrated();
  const router = useRouter();

  const [form, setForm] = useState({ customerName: "", phone: "", address: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-gray-600">Giỏ hàng của bạn đang trống.</p>
        <Link
          href="/san-pham"
          className="rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          phone: form.phone,
          address: form.address,
          note: form.note,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error || "Có lỗi xảy ra, vui lòng thử lại.";
        setError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      clear();
      toast.success(`Đặt hàng thành công! Mã đơn: ${data.code}`);
      router.push(`/don-hang-thanh-cong/${data.code}`);
    } catch {
      const message = "Không thể kết nối tới server, vui lòng thử lại.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-bold text-gray-900">Thông tin đặt hàng</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Họ tên *</label>
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Số điện thoại *</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Địa chỉ nhận hàng
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Để trống nếu bạn sẽ đến lấy tại cửa hàng"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ghi chú</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            Thanh toán khi nhận hàng (COD) hoặc tại cửa hàng. Chúng tôi sẽ gọi điện xác nhận đơn hàng.
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Đặt hàng"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Đơn hàng của bạn</h2>
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
          {items.map((item) => (
            <div key={item.variantId} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ""} x{item.quantity}
              </span>
              <span className="font-medium text-gray-900">
                {formatVND(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-semibold">
            <span>Tổng cộng</span>
            <span className="text-brand-600">{formatVND(cartTotal(items))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
