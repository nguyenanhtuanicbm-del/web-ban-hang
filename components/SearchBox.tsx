"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatVND } from "@/lib/format";
import ProductImage from "./ProductImage";
import type { ProductSuggestion } from "@/lib/queries";

export default function SearchBox({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();

    const timer = setTimeout(() => {
      if (!q) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(data.results ?? []))
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/san-pham?q=${encodeURIComponent(q)}`);
  }

  function goToProduct(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/san-pham/${slug}`);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Tìm sản phẩm..."
          className="w-full rounded-full border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none"
        />
      </form>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Không tìm thấy sản phẩm phù hợp.</p>
          ) : (
            <>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToProduct(s.slug)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <ProductImage src={s.image} alt={s.name} className="h-10 w-10 flex-shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{s.name}</span>
                  <span className="flex-shrink-0 text-sm font-medium text-brand-600">
                    {formatVND(s.minPrice)}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={goToResults}
                className="w-full border-t border-gray-100 px-3 py-2 text-center text-sm font-medium text-brand-600 hover:bg-gray-50"
              >
                Xem tất cả kết quả cho &quot;{query.trim()}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
