export default function Footer({ storeName }: { storeName: string }) {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">
        <p className="font-medium text-gray-700">{storeName}</p>
        <p className="mt-1">Đặt hàng online, nhận hàng và thanh toán tại cửa hàng hoặc khi nhận hàng (COD).</p>
        <p className="mt-4 text-xs text-gray-400">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
