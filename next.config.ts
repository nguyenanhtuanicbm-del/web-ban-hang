import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định của Next.js chỉ 1MB — quá nhỏ cho ảnh chụp từ điện thoại nên
      // mọi lần "thêm sản phẩm" kèm ảnh đều báo lỗi. Nâng lên nhưng vẫn ở dưới
      // giới hạn cứng 4.5MB cho Serverless Function request body của Vercel.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
