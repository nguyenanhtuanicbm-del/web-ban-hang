import type { Metadata } from "next";
import "./globals.css";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Cửa hàng của bạn";

export const metadata: Metadata = {
  title: storeName,
  description: `Website bán hàng chính thức của ${storeName}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
