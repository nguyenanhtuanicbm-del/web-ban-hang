"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { applyStockChange, getDefaultPriceListId, getDefaultWarehouseId } from "@/lib/stock";

export interface ImportRowError {
  row: number;
  reason: string;
}

export interface ImportResult {
  error?: string;
  productsCreated?: number;
  variantsCreated?: number;
  rowErrors?: ImportRowError[];
}

interface ParsedRow {
  rowNumber: number;
  productName: string;
  categoryName: string;
  description: string;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  unit: string;
  initialStock: number;
  lowStockThreshold: number;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value) return String((value as { text: unknown }).text ?? "");
    if ("result" in value) return String((value as { result: unknown }).result ?? "");
    if ("richText" in value) {
      return (value as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    }
    return "";
  }
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue): number {
  const text = cellText(value).replace(/[^\d.-]/g, "");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  for (const part of raw.split(",")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key && value) attrs[key] = value;
  }
  return attrs;
}

export async function importProductsFromExcel(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vui lòng chọn file Excel để nhập." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: "Không đọc được file. Vui lòng dùng đúng file .xlsx theo mẫu." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { error: "File không có dữ liệu." };
  }

  const columnIndex: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    columnIndex[cellText(cell.value)] = colNumber;
  });

  for (const col of ["Tên sản phẩm", "SKU", "Giá bán"]) {
    if (!columnIndex[col]) {
      return { error: `File thiếu cột bắt buộc "${col}". Vui lòng tải lại file mẫu.` };
    }
  }

  const rows: ParsedRow[] = [];
  const rowErrors: ImportRowError[] = [];
  const seenSkus = new Set<string>();

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (col: string) => (columnIndex[col] ? row.getCell(columnIndex[col]).value : null);

    const productName = cellText(get("Tên sản phẩm"));
    const sku = cellText(get("SKU"));

    if (!productName && !sku) return;

    if (!productName) {
      rowErrors.push({ row: rowNumber, reason: "Thiếu tên sản phẩm." });
      return;
    }
    if (!sku) {
      rowErrors.push({ row: rowNumber, reason: "Thiếu SKU." });
      return;
    }
    if (seenSkus.has(sku)) {
      rowErrors.push({ row: rowNumber, reason: `SKU "${sku}" bị trùng trong file.` });
      return;
    }
    const price = cellNumber(get("Giá bán"));
    if (!price) {
      rowErrors.push({ row: rowNumber, reason: "Thiếu hoặc sai giá bán." });
      return;
    }

    seenSkus.add(sku);
    rows.push({
      rowNumber,
      productName,
      categoryName: cellText(get("Danh mục")),
      description: cellText(get("Mô tả")),
      attributes: parseAttributes(cellText(get("Thuộc tính"))),
      sku,
      barcode: cellText(get("Mã vạch")),
      price,
      costPrice: cellNumber(get("Giá vốn")),
      unit: cellText(get("Đơn vị tính")) || "Cái",
      initialStock: cellNumber(get("Tồn kho ban đầu")),
      lowStockThreshold: cellNumber(get("Ngưỡng cảnh báo tồn")) || 5,
    });
  });

  if (rows.length === 0) {
    return { error: "Không có dòng dữ liệu hợp lệ nào trong file.", rowErrors };
  }

  const supabase = await createClient();

  try {
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("sku")
      .in("sku", rows.map((r) => r.sku));
    const existingSkus = new Set((existingVariants ?? []).map((v) => v.sku));

    const [defaultWarehouseId, defaultPriceListId, userResult, { data: categories }] = await Promise.all([
      getDefaultWarehouseId(supabase),
      getDefaultPriceListId(supabase),
      supabase.auth.getUser(),
      supabase.from("categories").select("id, name"),
    ]);
    const createdBy = userResult.data.user?.id ?? null;
    const categoryMap = new Map((categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

    const productGroups = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      if (existingSkus.has(row.sku)) {
        rowErrors.push({ row: row.rowNumber, reason: `SKU "${row.sku}" đã tồn tại trong hệ thống.` });
        continue;
      }
      const key = row.productName.trim().toLowerCase();
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(row);
    }

    const productNames = [...productGroups.values()].map((group) => group[0].productName);
    const { data: existingProducts } =
      productNames.length > 0
        ? await supabase.from("products").select("id, name").in("name", productNames)
        : { data: [] as { id: string; name: string }[] };
    const existingProductMap = new Map(
      (existingProducts ?? []).map((p) => [p.name.trim().toLowerCase(), p.id])
    );

    let productsCreated = 0;
    let variantsCreated = 0;

    for (const [key, groupRows] of productGroups) {
      if (groupRows.length === 0) continue;
      const first = groupRows[0];

      let productId = existingProductMap.get(key);

      if (!productId) {
        let categoryId: string | null = null;
        if (first.categoryName) {
          const normalized = first.categoryName.trim().toLowerCase();
          categoryId = categoryMap.get(normalized) ?? null;
          if (!categoryId) {
            const { data: newCategory } = await supabase
              .from("categories")
              .insert({ name: first.categoryName, slug: slugify(first.categoryName) })
              .select("id")
              .single();
            if (newCategory) {
              categoryId = newCategory.id;
              categoryMap.set(normalized, newCategory.id);
            }
          }
        }

        const { data: product, error: productError } = await supabase
          .from("products")
          .insert({
            name: first.productName,
            slug: slugify(first.productName),
            description: first.description || null,
            category_id: categoryId,
            images: [],
            is_active: true,
          })
          .select("id")
          .single();

        if (productError || !product) {
          for (const row of groupRows) {
            rowErrors.push({
              row: row.rowNumber,
              reason: "Không thể tạo sản phẩm (có thể trùng tên/đường dẫn).",
            });
          }
          continue;
        }

        productId = product.id;
        existingProductMap.set(key, product.id);
        productsCreated += 1;
      }

      for (const row of groupRows) {
        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .insert({
            product_id: productId,
            sku: row.sku,
            barcode: row.barcode || null,
            attributes: row.attributes,
            cost_price: row.costPrice,
            low_stock_threshold: row.lowStockThreshold,
            unit: row.unit,
            is_active: true,
          })
          .select("id")
          .single();

        if (variantError || !variant) {
          rowErrors.push({ row: row.rowNumber, reason: "Không thể tạo biến thể (SKU có thể trùng)." });
          continue;
        }

        if (defaultPriceListId) {
          await supabase.from("price_list_items").insert({
            price_list_id: defaultPriceListId,
            variant_id: variant.id,
            price: row.price,
          });
        }

        if (row.initialStock > 0 && defaultWarehouseId) {
          await applyStockChange(supabase, {
            variantId: variant.id,
            warehouseId: defaultWarehouseId,
            quantityChange: row.initialStock,
            changeType: "manual",
            referenceType: "product_import",
            note: "Tồn kho ban đầu khi nhập từ Excel",
            createdBy,
          });
        }

        variantsCreated += 1;
      }
    }

    revalidatePath("/admin/san-pham");
    revalidatePath("/admin/danh-muc");
    revalidatePath("/");

    return {
      productsCreated,
      variantsCreated,
      rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
    };
  } catch {
    return { error: "Có lỗi không mong muốn khi xử lý file, vui lòng thử lại." };
  }
}
