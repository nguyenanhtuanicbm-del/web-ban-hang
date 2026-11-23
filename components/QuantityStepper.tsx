"use client";

import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({
  value,
  min = 1,
  max,
  unit,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);

  return (
    <div className="inline-flex items-center rounded-md border border-gray-300">
      <button
        type="button"
        onClick={dec}
        className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        disabled={value <= min}
        aria-label="Giảm số lượng"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-10 px-1 text-center text-sm font-medium">
        {value}
        {unit ? <span className="text-gray-400"> {unit}</span> : null}
      </span>
      <button
        type="button"
        onClick={inc}
        className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        disabled={max !== undefined && value >= max}
        aria-label="Tăng số lượng"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
