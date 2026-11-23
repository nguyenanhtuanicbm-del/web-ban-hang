"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Download } from "lucide-react";
import { importProductsFromExcel, type ImportResult } from "./actions";

const initialState: ImportResult = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Đang xử lý..." : "Nhập sản phẩm"}
    </button>
  );
}

export default function ImportExcelPage() {
  const [state, formAction] = useActionState(importProductsFromExcel, initialState);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Nhập sản phẩm từ Excel</h1>
        <Link href="/admin/san-pham" className="text-sm text-brand-600 hover:underline">
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <p className="mb-3">
          Tải file mẫu, điền thông tin theo đúng định dạng (xem sheet &quot;Hướng dẫn&quot; trong
          file — hỗ trợ nhiều biến thể cho 1 sản phẩm bằng cách lặp lại tên sản phẩm ở nhiều
          dòng), rồi tải file đã điền lên bên dưới.
        </p>
        <a
          href="/mau-nhap-san-pham.xlsx"
          download
          className="inline-flex items-center gap-2 font-medium text-brand-600 hover:underline"
        >
          <Download className="h-4 w-4" />
          Tải file mẫu Excel
        </a>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Chọn file Excel (.xlsx) *
          </label>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <SubmitButton />
      </form>

      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {(state.productsCreated !== undefined || state.variantsCreated !== undefined) && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Đã tạo {state.productsCreated ?? 0} sản phẩm mới, {state.variantsCreated ?? 0} biến thể.
        </div>
      )}

      {state.rowErrors && state.rowErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">
            {state.rowErrors.length} dòng bị bỏ qua:
          </p>
          <ul className="flex flex-col gap-1 text-sm text-amber-700">
            {state.rowErrors.map((e, i) => (
              <li key={i}>
                Dòng {e.row}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
