import { createClient } from "@/lib/supabase/server";
import { getDefaultPriceListId } from "@/lib/stock";
import { formatVariantAttributes } from "@/lib/types";
import { chunkArray } from "@/lib/utils";
import LabelPrintView, { type LabelItem } from "@/components/admin/LabelPrintView";

export const revalidate = 0;

const ID_BATCH_SIZE = 150;

interface ProductWithVariants {
  id: string;
  name: string;
  variants: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    unit: string;
    is_active: boolean;
  }[];
}

export default async function PrintLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").filter(Boolean);

  if (ids.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900">In tem sản phẩm</h1>
        <p className="text-gray-500">
          Chưa chọn sản phẩm nào. Vào danh sách sản phẩm, tick chọn sản phẩm cần in tem rồi bấm
          &quot;In tem&quot;.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const idBatches = chunkArray(ids, ID_BATCH_SIZE);

  const [productResults, defaultPriceListId] = await Promise.all([
    Promise.all(
      idBatches.map((batch) =>
        supabase
          .from("products")
          .select("id, name, variants:product_variants(id, sku, attributes, unit, is_active)")
          .in("id", batch)
      )
    ),
    getDefaultPriceListId(supabase),
  ]);

  const products = productResults.flatMap((r) => (r.data ?? [])) as unknown as ProductWithVariants[];
  const variantIds = products.flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => v.id));

  let priceMap = new Map<string, number>();
  if (defaultPriceListId && variantIds.length > 0) {
    const variantBatches = chunkArray(variantIds, ID_BATCH_SIZE);
    const priceResults = await Promise.all(
      variantBatches.map((batch) =>
        supabase
          .from("price_list_items")
          .select("variant_id, price")
          .eq("price_list_id", defaultPriceListId)
          .in("variant_id", batch)
      )
    );
    priceMap = new Map(
      priceResults.flatMap((r) => (r.data ?? []).map((p) => [p.variant_id, p.price] as const))
    );
  }

  const labels: LabelItem[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.is_active) continue;
      labels.push({
        key: v.id,
        productName: p.name,
        attrLabel: formatVariantAttributes(v.attributes),
        sku: v.sku,
        price: priceMap.get(v.id) ?? 0,
        unit: v.unit || "Cái",
      });
    }
  }

  return <LabelPrintView items={labels} />;
}
