"use client";

import { useState } from "react";
import ProductImage from "./ProductImage";

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
        <ProductImage src={current} alt={alt} className="h-full w-full" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded-md border-2 ${
                i === active ? "border-brand-600" : "border-transparent"
              }`}
            >
              <ProductImage src={img} alt={`${alt} ${i + 1}`} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
