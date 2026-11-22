"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  Store,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/san-pham", label: "Sản phẩm", icon: Package },
  { href: "/admin/danh-muc", label: "Danh mục", icon: Tags },
  { href: "/admin/don-hang", label: "Đơn hàng", icon: ClipboardList },
  { href: "/admin/ban-tai-cua-hang", label: "Bán tại cửa hàng", icon: Store },
];

export default function AdminSidebar({
  onSignOut,
}: {
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-5 text-lg font-bold text-brand-700">Quản trị cửa hàng</div>
      <nav className="flex-1 space-y-1 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={onSignOut} className="border-t border-gray-200 p-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </form>
    </aside>
  );
}
