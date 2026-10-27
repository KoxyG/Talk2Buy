// Filters applied to every store's search results, so answers stay correct even when a store's
// own search ignores some hints.

import type { Day, ProductResult, Shop } from "../adapters";

const DAYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Shops keep Nigerian time (WAT, UTC+1, no daylight saving).
export function isOpen(shop: Shop, now: Date): boolean {
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const hours = shop.openingHours[DAYS[wat.getUTCDay()]!];
  if (!hours) return false;
  const time = wat.toISOString().slice(11, 16); // "HH:MM"
  return time >= hours[0] && time < hours[1];
}

export type Filters = { area: string; category?: string; maxPrice?: number; maxEtaMinutes?: number; now: Date };

export function applyFilters(results: ProductResult[], f: Filters): ProductResult[] {
  return results.filter((p) =>
    p.shop.area.toLowerCase() === f.area.toLowerCase() &&
    (!f.category || p.category === f.category) &&
    (f.maxPrice === undefined || p.price <= f.maxPrice) &&
    (f.maxEtaMinutes === undefined || p.etaMinutes <= f.maxEtaMinutes) &&
    p.inStock &&
    isOpen(p.shop, f.now));
}

const UNIT_WORDS = ["carton", "crate", "paint", "derica", "tin", "sachet", "loaf", "bottle", "cup", "bag", "basket", "pack", "bar", "tube"];
const UNIT_ALIASES: Record<string, string> = { kg: "kg", l: "litre", litre: "litre", liter: "litre", litres: "litre", liters: "litre" };

// "5kg rice" -> { unit: "kg", size: 5 }; "indomie carton" -> { unit: "carton" }.
export function requestedSize(query: string): { unit: string; size?: number } | null {
  const measured = query.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|litres?|liters?|l)\b/);
  if (measured) return { unit: UNIT_ALIASES[measured[2]!]!, size: Number(measured[1]) };
  const word = query.toLowerCase().split(/[^a-z]+/).map((w) => w.replace(/s$/, "")).find((w) => UNIT_WORDS.includes(w));
  return word ? { unit: word } : null;
}

// Keeps only the requested size when the shops have it; otherwise keeps everything and says so.
export function narrowBySize(results: ProductResult[], query: string): { results: ProductResult[]; note?: string } {
  const wanted = requestedSize(query);
  if (!wanted || !results.length) return { results };
  const matching = results.filter((p) => p.unit === wanted.unit && (wanted.size === undefined || p.size === wanted.size));
  if (matching.length) return { results: matching };
  const label = wanted.size === undefined ? wanted.unit : `${wanted.size}${wanted.unit === "kg" ? "kg" : ` ${wanted.unit}`}`;
  return { results, note: `No ${label} option found; these are other sizes.` };
}
