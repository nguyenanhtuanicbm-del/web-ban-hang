import { NextResponse } from "next/server";
import { searchProductSuggestions } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = await searchProductSuggestions(q);
  return NextResponse.json({ results });
}
