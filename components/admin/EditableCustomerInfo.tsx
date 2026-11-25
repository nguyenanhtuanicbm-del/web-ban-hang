"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

interface OrderCustomerInfo {
  id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  note: string | null;
}

export default function EditableCustomerInfo({
  order,
  action,
}: {
  order: OrderCustomerInfo;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form action={action} onSubmit={() => setEditing(false)} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={order.id} />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Họ tên *</label>
          <input
            name="customer_name"
            required
            defaultValue={order.customer_name}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Điện thoại</label>
          <input
            name="phone"
            defaultValue={order.phone === "—" ? "" : order.phone}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Địa chỉ</label>
          <input
            name="address"
            defaultValue={order.address ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Ghi chú</label>
          <input
            name="note"
            defaultValue={order.note ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Khách hàng</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" />
          Sửa
        </button>
      </div>
      <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
        <dt className="text-gray-500">Họ tên</dt>
        <dd>{order.customer_name}</dd>
        <dt className="text-gray-500">Điện thoại</dt>
        <dd>{order.phone === "—" ? "—" : order.phone}</dd>
        <dt className="text-gray-500">Địa chỉ</dt>
        <dd>{order.address || "—"}</dd>
        <dt className="text-gray-500">Ghi chú</dt>
        <dd>{order.note || "—"}</dd>
      </dl>
    </div>
  );
}
