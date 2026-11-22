import { Category, Product } from "@/lib/types";
import ProductImage from "@/components/ProductImage";

export default function ProductForm({
  categories,
  product,
  action,
}: {
  categories: Category[];
  product?: Product;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tên sản phẩm *</label>
        <input
          name="name"
          required
          defaultValue={product?.name}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Đường dẫn (slug)</label>
        <input
          name="slug"
          defaultValue={product?.slug}
          placeholder="Để trống để tự tạo từ tên sản phẩm"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Danh mục</label>
        <select
          name="category_id"
          defaultValue={product?.category_id ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        >
          <option value="">Không có danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Giá bán *</label>
          <input
            name="price"
            type="number"
            min={0}
            required
            defaultValue={product?.price}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Giá gốc (hiện gạch ngang)
          </label>
          <input
            name="compare_at_price"
            type="number"
            min={0}
            defaultValue={product?.compare_at_price ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tồn kho *</label>
        <input
          name="stock"
          type="number"
          min={0}
          required
          defaultValue={product?.stock ?? 0}
          className="w-full max-w-[160px] rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
        />
      </div>

      {product && product.images.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Ảnh hiện tại</label>
          <div className="flex flex-wrap gap-4">
            {product.images.map((url) => (
              <div key={url} className="flex flex-col items-center gap-1">
                <ProductImage src={url} alt="" className="h-20 w-20 rounded-md" />
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input type="checkbox" name="keep_image" value={url} defaultChecked />
                  Giữ lại
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Thêm ảnh mới</label>
        <input
          name="images"
          type="file"
          accept="image/*"
          multiple
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
        Hiển thị sản phẩm trên cửa hàng
      </label>

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
      >
        {product ? "Lưu thay đổi" : "Tạo sản phẩm"}
      </button>
    </form>
  );
}
