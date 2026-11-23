"use client";

import { useMemo, useState } from "react";
import { Product, Variant } from "@/lib/types";
import { formatVND } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";

function getAttributeOptions(variants: Variant[]): Record<string, string[]> {
  const options: Record<string, string[]> = {};
  for (const v of variants) {
    for (const [key, value] of Object.entries(v.attributes)) {
      if (!options[key]) options[key] = [];
      if (!options[key].includes(value)) options[key].push(value);
    }
  }
  return options;
}

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const attributeOptions = useMemo(() => getAttributeOptions(variants), [variants]);
  const attributeKeys = Object.keys(attributeOptions);

  const firstAvailable = variants.find((v) => (v.total_stock ?? 0) > 0) ?? variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(firstAvailable?.attributes ?? {});

  const selectedVariant =
    variants.find((v) => attributeKeys.every((key) => v.attributes[key] === selection[key])) ??
    variants[0];

  if (!selectedVariant) {
    return <p className="text-gray-500">Sản phẩm hiện không có biến thể nào để bán.</p>;
  }

  const stock = selectedVariant.total_stock ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-2xl font-bold text-brand-600">
        {formatVND(selectedVariant.price ?? 0)}
        <span className="text-sm font-normal text-gray-400">/{selectedVariant.unit || "Cái"}</span>
      </span>

      {attributeKeys.length > 0 && (
        <div className="flex flex-col gap-3">
          {attributeKeys.map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{key}</label>
              <div className="flex flex-wrap gap-2">
                {attributeOptions[key].map((value) => {
                  const active = selection[key] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelection((s) => ({ ...s, [key]: value }))}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-gray-300 text-gray-700 hover:border-brand-600"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">
        {stock > 0 ? `Còn ${stock} ${selectedVariant.unit || "Cái"}` : "Hiện đã hết hàng"}
      </p>

      <AddToCartButton product={product} variant={selectedVariant} />
    </div>
  );
}
