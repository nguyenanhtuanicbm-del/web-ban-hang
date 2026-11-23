import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultPriceListId } from "@/lib/stock";
import {
  filterStockValueRows,
  getStockValueRows,
  sortStockValueRowsByValueDesc,
} from "@/lib/inventory-value";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("kho") || undefined;
  const q = searchParams.get("q") || undefined;

  const supabase = await createClient();
  const defaultPriceListId = await getDefaultPriceListId(supabase);
  const rows = sortStockValueRowsByValueDesc(
    filterStockValueRows(await getStockValueRows(supabase, { warehouseId, defaultPriceListId }), q)
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Giá trị tồn kho");

  sheet.columns = [
    { header: "Sản phẩm", width: 32 },
    { header: "SKU", width: 18 },
    { header: "Danh mục", width: 16 },
    { header: "Tồn kho", width: 10 },
    { header: "Giá vốn", width: 14 },
    { header: "Giá trị vốn", width: 16 },
    { header: "Giá bán", width: 14 },
    { header: "Giá trị bán", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.attrLabel ? `${r.productName} (${r.attrLabel})` : r.productName,
      r.sku,
      r.categoryName ?? "",
      r.quantity,
      r.costPrice,
      r.quantity * r.costPrice,
      r.price,
      r.quantity * r.price,
    ]);
  }

  const totalRow = sheet.addRow([
    "TỔNG CỘNG",
    "",
    "",
    rows.reduce((sum, r) => sum + r.quantity, 0),
    "",
    rows.reduce((sum, r) => sum + r.quantity * r.costPrice, 0),
    "",
    rows.reduce((sum, r) => sum + r.quantity * r.price, 0),
  ]);
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="gia-tri-ton-kho.xlsx"',
    },
  });
}
