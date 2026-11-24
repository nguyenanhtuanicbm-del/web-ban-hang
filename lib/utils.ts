/**
 * Chia 1 mảng thành nhiều mảng con kích thước tối đa `size` — dùng trước khi gọi `.in(...)`
 * với danh sách id dài (vài trăm sản phẩm trở lên), vì nhét toàn bộ id vào 1 query string duy
 * nhất dễ vượt giới hạn độ dài URL và khiến Supabase trả về rỗng (giá/tồn kho hiện thành 0).
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
