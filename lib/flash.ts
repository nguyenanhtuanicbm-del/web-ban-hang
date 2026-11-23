import { cookies } from "next/headers";

export type FlashType = "success" | "error";

/**
 * Ghi 1 thông báo "flash" ngắn hạn vào cookie, để component FlashToast (client) đọc và hiện
 * toast ngay sau khi 1 server action hoàn tất — kể cả khi action đó redirect() sang trang khác
 * (phải gọi setFlash TRƯỚC redirect(), vì redirect() throw nên code sau đó không chạy nữa).
 */
export async function setFlash(type: FlashType, message: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("flash", JSON.stringify({ type, message }), {
    maxAge: 10,
    path: "/",
  });
}
