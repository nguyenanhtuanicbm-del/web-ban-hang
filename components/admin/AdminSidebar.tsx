"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  Store,
  Users,
  Warehouse,
  Truck,
  PackagePlus,
  ClipboardCheck,
  ArrowLeftRight,
  ScrollText,
  LogOut,
} from "lucide-react";

const groups = [
  {
    title: "Bán hàng",
    links: [
      { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/admin/ban-tai-cua-hang", label: "Bán tại cửa hàng", icon: Store },
      { href: "/admin/don-hang", label: "Đơn hàng", icon: ClipboardList },
    ],
  },
  {
    title: "Sản phẩm",
    links: [
      { href: "/admin/san-pham", label: "Sản phẩm", icon: Package },
      { href: "/admin/danh-muc", label: "Danh mục", icon: Tags },
    ],
  },
  {
    title: "Kho hàng",
    links: [
      { href: "/admin/kho/kho-hang", label: "Danh sách kho", icon: Warehouse },
      { href: "/admin/kho/nha-cung-cap", label: "Nhà cung cấp", icon: Truck },
      { href: "/admin/kho/phieu-nhap", label: "Phiếu nhập hàng", icon: PackagePlus },
      { href: "/admin/kho/kiem-ke", label: "Kiểm kho", icon: ClipboardCheck },
      { href: "/admin/kho/dieu-chuyen", label: "Điều chuyển kho", icon: ArrowLeftRight },
      { href: "/admin/kho/the-kho", label: "Thẻ kho", icon: ScrollText },
    ],
  },
  {
    title: "Khách hàng",
    links: [{ href: "/admin/khach-hang", label: "Danh sách khách hàng", icon: Users }],
  },
];

export default function AdminSidebar({
  onSignOut,
}: {
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-5 text-lg font-bold text-brand-700">Quản trị cửa hàng</div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase text-gray-400">{group.title}</p>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon }) => {
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
            </div>
          </div>
        ))}
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
