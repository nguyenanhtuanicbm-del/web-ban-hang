"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

function readFlashCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )flash=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function clearFlashCookie() {
  document.cookie = "flash=; max-age=0; path=/";
}

/**
 * Đặt 1 lần ở root layout. Nhiều server action (xóa, đổi trạng thái...) không điều hướng
 * trang nên không có tín hiệu "vừa xong" đáng tin cậy nào khác ngoài theo dõi liên tục —
 * polling document.cookie mỗi 300ms là thao tác rẻ, không ảnh hưởng hiệu năng.
 */
export default function FlashToast() {
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    const check = () => {
      const raw = readFlashCookie();
      if (!raw || raw === lastSeen.current) return;
      lastSeen.current = raw;

      try {
        const { type, message } = JSON.parse(raw) as { type: string; message: string };
        if (type === "success") toast.success(message);
        else toast.error(message);
      } catch {
        // bỏ qua nếu cookie bị hỏng/không đúng định dạng
      } finally {
        clearFlashCookie();
      }
    };

    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, []);

  return null;
}
