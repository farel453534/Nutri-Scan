import { FoodNutrition } from "@/types/food";

const BASE = "https://world.openfoodfacts.org";

function parseServingSize(raw?: string): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d+(?:\.\d+)?)\s*g/i);
  return match ? parseFloat(match[1]) : undefined;
}

function parseProduct(p: Record<string, unknown>): FoodNutrition | null {
  if (!p) return null;
  const n = (p.nutriments as Record<string, number>) || {};
  const cal =
    n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy_100g"];
  const name = (p.product_name as string) || (p.product_name_en as string);
  if (!name || !cal) return null;
  return {
    id: (p.code as string) || `${Date.now()}-${Math.random()}`,
    name: name.trim(),
    brand: p.brands ? (p.brands as string).split(",")[0]?.trim() : undefined,
    barcode: p.code as string,
    caloriesPer100g: Math.round(cal),
    proteinPer100g: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fatPer100g: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiberPer100g:
      n.fiber_100g != null
        ? Math.round(n.fiber_100g * 10) / 10
        : undefined,
    servingSizeG: parseServingSize(p.serving_size as string),
  };
}

export async function lookupBarcode(
  barcode: string
): Promise<FoodNutrition | null> {
  try {
    const res = await fetch(
      `${BASE}/api/v0/product/${barcode}.json?fields=product_name,product_name_en,brands,nutriments,code,serving_size`
    );
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return parseProduct(data.product);
  } catch {
    return null;
  }
}

export async function searchFood(
  query: string
): Promise<FoodNutrition[]> {
  try {
    const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&json=1&page_size=20&fields=product_name,product_name_en,brands,nutriments,code,serving_size`;
    const res = await fetch(url);
    const data = await res.json();
    return ((data.products as Record<string, unknown>[]) || [])
      .map(parseProduct)
      .filter((f): f is FoodNutrition => f !== null);
  } catch {
    return [];
  }
}
