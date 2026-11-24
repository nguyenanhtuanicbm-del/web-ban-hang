"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({
  value,
  height = 36,
}: {
  value: string;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 11,
        height,
        width: 1.3,
        margin: 2,
      });
    } catch {
      // Giá trị không hợp lệ cho mã vạch (vd ký tự đặc biệt) — bỏ qua, tem vẫn hiện tên/giá.
    }
  }, [value, height]);

  if (!value) return null;
  return <svg ref={ref} />;
}
