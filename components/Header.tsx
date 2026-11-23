"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCartStore, useCartHydrated, cartCount } from "@/store/cart";
import SearchBox from "./SearchBox";

export default function Header({ storeName }: { storeName: string }) {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartHydrated();
  const [menuOpen, setMenuOpen] = useState(false);

  const count = hydrated ? cartCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex-shrink-0 text-lg font-bold text-brand-700">
          {storeName}
        </Link>

        <div className="hidden flex-1 sm:block sm:max-w-xs">
          <SearchBox />
        </div>

        <nav className="hidden flex-shrink-0 items-center gap-6 text-sm font-medium text-gray-700 sm:flex">
          <Link href="/" className="hover:text-brand-600">
            Trang chủ
          </Link>
          <Link href="/san-pham" className="hover:text-brand-600">
            Sản phẩm
          </Link>
        </nav>

        <div className="ml-auto flex flex-shrink-0 items-center gap-3 sm:ml-0">
          <Link href="/gio-hang" className="relative rounded-full p-2 hover:bg-gray-100">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            className="rounded-full p-2 hover:bg-gray-100 sm:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-2 sm:hidden">
        <SearchBox />
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 sm:hidden">
          <Link href="/" className="rounded px-2 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Trang chủ
          </Link>
          <Link
            href="/san-pham"
            className="rounded px-2 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Sản phẩm
          </Link>
        </nav>
      )}
    </header>
  );
}
