import Header from "@/components/Header";
import Footer from "@/components/Footer";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Cửa hàng của bạn";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header storeName={storeName} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer storeName={storeName} />
    </div>
  );
}
