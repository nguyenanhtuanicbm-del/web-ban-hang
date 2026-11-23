"use client";

import { useState } from "react";

const MAX_TOTAL_MB = 5;

export default function ImageFilePicker({ name }: { name: string }) {
  const [warning, setWarning] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const totalMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

    if (totalMb > MAX_TOTAL_MB) {
      setWarning(
        `Tổng dung lượng ảnh đã chọn (${totalMb.toFixed(1)}MB) vượt quá ${MAX_TOTAL_MB}MB cho phép. Vui lòng chọn ít ảnh hơn hoặc nén ảnh lại trước khi tải lên.`
      );
      e.target.value = "";
    } else {
      setWarning(null);
    }
  }

  return (
    <div>
      <input
        name={name}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="w-full max-w-2xl rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {warning && <p className="mt-1 text-sm text-red-600">{warning}</p>}
      <p className="mt-1 text-xs text-gray-400">
        Tổng dung lượng ảnh tối đa {MAX_TOTAL_MB}MB cho mỗi lần lưu.
      </p>
    </div>
  );
}
