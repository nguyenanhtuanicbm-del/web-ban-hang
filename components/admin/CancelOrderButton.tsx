"use client";

export default function CancelOrderButton({
  orderId,
  action,
}: {
  orderId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            "Bạn có chắc muốn hủy đơn hàng này? Tồn kho các sản phẩm trong đơn sẽ được hoàn lại."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Hủy đơn hàng
      </button>
    </form>
  );
}
