import Link from "next/link";
import { getActiveProducts, getCategories } from "@/lib/queries";
import ProductGrid from "@/components/ProductGrid";

// Không đọc searchParams nên Next.js cache được theo URL — tối đa 30s dữ liệu cũ,
// chấp nhận được vì /api/orders luôn tính lại giá/tồn kho thật lúc đặt hàng.
export const revalidate = 30;

export default async function HomePage() {
  // Trang này được Next.js tiền xử lý (prerender) lúc build — nếu Supabase tạm thời không
  // phản hồi được đúng lúc đó, bắt lỗi để build vẫn thành công (hiện rỗng tạm thời) thay vì
  // làm hỏng cả lần deploy; trang sẽ tự có dữ liệu đúng ở lần ghé thăm/revalidate kế tiếp.
  let products: Awaited<ReturnType<typeof getActiveProducts>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  } catch (error) {
    console.error("Không tải được sản phẩm/danh mục cho trang chủ:", error);
  }
  const featured = products.slice(0, 8);

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-xl bg-brand-50 px-6 py-12 text-center sm:py-16">
        <h1 className="text-2xl font-bold text-brand-700 sm:text-3xl">
          Chào mừng bạn đến với cửa hàng
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          Sản phẩm chất lượng, giá tốt. Đặt hàng online, thanh toán khi nhận hàng hoặc tại cửa hàng.
        </p>
        <Link
          href="/san-pham"
          className="mt-6 inline-block rounded-md bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          Xem tất cả sản phẩm
        </Link>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Danh mục</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/san-pham?danh-muc=${category.slug}`}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-600 hover:text-brand-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Sản phẩm nổi bật</h2>
          <Link href="/san-pham" className="text-sm font-medium text-brand-600 hover:underline">
            Xem tất cả
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>
    </div>
  );
}
