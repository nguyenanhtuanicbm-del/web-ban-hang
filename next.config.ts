import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định của Next.js chỉ 1MB — quá nhỏ cho ảnh chụp từ điện thoại nên
      // mọi lần "thêm sản phẩm" kèm ảnh đều báo lỗi. Nâng lên nhưng vẫn ở dưới
      // giới hạn payload đồng bộ của hạ tầng serverless trên Netlify (~6MB).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
