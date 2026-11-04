// Filters applied to every store's search results, so answers stay correct even when a store's
// own search ignores some hints.

import type { Day, ProductResult, Shop } from "../adapters";

const DAYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Nigerian time (WAT, UTC+1, no daylight saving): the weekday and "HH:MM".
function wat(now: Date): { day: number; time: string } {
  const t = new Date(now.getTime() + 60 * 60 * 1000);
  return { day: t.getUTCDay(), time: t.toISOString().slice(11, 16) };
}

type Hours = Pick<Shop, "openingHours">;

// Shops keep Nigerian time. Hours that close before they open run past midnight ("18:00"-"02:00").
export function isOpen(shop: Hours, now: Date): boolean {
  const { day, time } = wat(now);
  const today = shop.openingHours[DAYS[day]!];
  if (today && time >= today[0] && (today[0] > today[1] || time < today[1])) return true;
  const yesterday = shop.openingHours[DAYS[(day + 6) % 7]!];
  return !!yesterday && yesterday[0] > yesterday[1] && time < yesterday[1];
}

// When a closed shop next opens: "08:00" later today, otherwise "Mon 08:00"; null if it never does.
export function opensAt(shop: Hours, now: Date): string | null {
  const { day, time } = wat(now);
  for (let i = 0; i <= 7; i++) {
    const hours = shop.openingHours[DAYS[(day + i) % 7]!];
    if (hours && (i > 0 || hours[0] > time)) return i === 0 ? hours[0] : `${LABELS[(day + i) % 7]} ${hours[0]}`;
  }
  return null;
}

// What tools report about a shop's hours: open_now, and when a closed shop opens.
export function openStatus(shop: Hours, now: Date): { open_now: boolean; opens_at?: string } {
  if (isOpen(shop, now)) return { open_now: true };
  const opens = opensAt(shop, now);
  return { open_now: false, ...(opens && { opens_at: opens }) };
}

// Closed shops are kept: customers see them, marked closed, and may add them to the cart.
export type Filters = { area: string; category?: string; maxPrice?: number; maxEtaMinutes?: number };

export function applyFilters(results: ProductResult[], f: Filters): ProductResult[] {
  return results.filter((p) =>
    p.shop.area.toLowerCase() === f.area.toLowerCase() &&
    (!f.category || p.category === f.category) &&
    (f.maxPrice === undefined || p.price <= f.maxPrice) &&
    (f.maxEtaMinutes === undefined || p.etaMinutes <= f.maxEtaMinutes) &&
    p.inStock);
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

// "spaghetti pack" -> "spaghetti", for stores that don't put pack words in product names.
export function stripUnitWords(query: string): string {
  return query.split(/\s+/).filter((w) => !UNIT_WORDS.includes(w.toLowerCase().replace(/s$/, ""))).join(" ");
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

const words = (text: string) => text.toLowerCase().split(/[^a-z]+/).filter(Boolean).map((w) => w.replace(/s$/, ""));

// Closest name first: the exact name, then names with more of the query's words and fewer others;
// the cheapest first among equally close names. "water" -> "water" (₦200) before
// "One pack of water" (₦200, more words) and "waterimages" (₦3,000, no word matches).
export function rankByName(results: ProductResult[], query: string): ProductResult[] {
  const want = words(query);
  const keys = new Map(results.map((p) => {
    const have = words(p.name);
    const hits = want.filter((w) => have.includes(w)).length;
    const exact = hits === want.length && have.length === hits ? 0 : 1;
    return [p, [exact, want.length - hits, have.length - hits, p.price]];
  }));
  return [...results].sort((a, b) => {
    const x = keys.get(a)!;
    const y = keys.get(b)!;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
    return 0;
  });
}
