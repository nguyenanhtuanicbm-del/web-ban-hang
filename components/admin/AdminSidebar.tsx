"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  // Tự đóng drawer mỗi khi chuyển trang (chỉ có hiệu lực trên mobile, desktop luôn hiện sẵn).
  // Cập nhật state ngay trong lúc render (theo khuyến nghị của React cho pattern "reset state khi
  // 1 giá trị thay đổi") thay vì effect, để tránh render thừa.
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <span className="text-base font-bold text-brand-700">Quản trị cửa hàng</span>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:h-screen lg:flex-shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <span className="text-lg font-bold text-brand-700">Quản trị cửa hàng</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase text-gray-400">
                {group.title}
              </p>
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
    </>
  );
}
