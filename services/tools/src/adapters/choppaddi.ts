// Choppaddi, read through its public API exactly as it is. Built per project from adapter_config:
//   { "apiUrl": "https://testnet.choppaddi.cloud/api/v1" }
// Choppaddi takes no orders through its API from us: create_order hands the cart to Choppaddi's
// page (checkout "handoff"), which loads it into its own cart and checkout. The order methods
// throw if anything reaches them.
// Choppaddi publishes preparation times but no delivery times, so ETAs are preparation only
// (etaKind "preparation").

import type { Category, Day, HandoffCart, Order, Product, ProductResult, Shop, StoreAdapter } from "./types";

export type ChoppaddiConfig = { apiUrl: string };

const TIMEOUT_MS = 15_000;
const VENDORS_TTL_MS = 60_000;

type Vendor = {
  uuid: string; slug: string; name: string; vendor_type: string | null; categories: string[] | null;
  address: string | null; city: string | null; state: string | null;
  opening_time: string | null; closing_time: string | null; business_days: string[] | null; preparation_time: number | null;
};
type Variant = {
  uuid: string; price: number | null; stock_quantity: number | null; is_active: boolean;
  values: { attributeValue: { attribute_uuid: string; value: string } }[];
};
type Attribute = { uuid: string; display_order: number };
type ChoppaddiProduct = {
  uuid: string; vendor_uuid: string; name: string; description: string | null; categories: string[] | null;
  price: number; discount: number | null; discount_price: number | null; processing_time: string | null;
  stock: boolean; deleted_at: string | null; has_variants?: boolean; attributes?: Attribute[]; variants?: Variant[];
};

const DAYS: Record<string, Day> = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

// "6:30 AM" -> "06:30", "11:30 PM" -> "23:30"; "8:00" -> "08:00", as Choppaddi's site reads it.
function to24h(time: string | null): string | null {
  const t = time?.trim() ?? "";
  const h24 = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (h24) return Number(h24[1]) < 24 ? `${h24[1]!.padStart(2, "0")}:${h24[2]}` : null;
  const m = t.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  const hour = (Number(m[1]) % 12) + (m[3]!.toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${m[2]}`;
}

// Vendors keep their location in a free-text address ("Asaba, Delta, Nigeria"; city is often
// empty), so a vendor is in the customer's area when its address mentions it.
function inArea(v: Vendor, area: string) {
  const where = `${v.city ?? ""} ${v.state ?? ""} ${v.address ?? ""}`.toLowerCase();
  return where.includes(area.trim().toLowerCase());
}

const FOOD = /food|meal|restaurant|kitchen|snack|rice|soup|swallow|chop|grill|breakfast|lunch|dinner/i;
const isFood = (categories: string[] | null, ...more: (string | null)[]) => [...(categories ?? []), ...more].some((c) => c && FOOD.test(c));

const UNITS = ["pack", "bottle", "sachet", "carton", "crate", "bag", "tin", "plate", "loaf", "cup", "bar", "tube", "paint", "derica"];
const unitOf = (name: string) => name.toLowerCase().split(/[^a-z]+/).map((w) => w.replace(/s$/, "")).find((w) => UNITS.includes(w)) ?? null;

function toShop(v: Vendor, area: string): Shop {
  const open = to24h(v.opening_time);
  const close = to24h(v.closing_time);
  const openingHours: Shop["openingHours"] = {};
  if (open && close) {
    // No business days means every day, as Choppaddi's site reads it.
    for (const d of v.business_days?.length ? v.business_days : Object.keys(DAYS)) {
      const day = DAYS[d.toLowerCase()];
      if (day) openingHours[day] = [open, close];
    }
  }
  return {
    id: v.uuid,
    name: v.name,
    type: isFood(v.categories, v.vendor_type) ? "restaurant" : "grocery",
    area: inArea(v, area) ? area : (v.city ?? v.address ?? ""),
    openingHours,
    avgPrepMinutes: v.preparation_time ?? 0,
  };
}

// IDs carry the vendor slug, because Choppaddi looks products up by vendor and product together,
// and the variant for products sold in variants: "slug:product" or "slug:product:variant".
const toId = (v: Vendor, p: ChoppaddiProduct, variant?: Variant) => [v.slug, p.uuid, variant?.uuid].filter(Boolean).join(":");

// "M, Red": the variant's values in the product's attribute order (Size, then Colour).
function variantName(p: ChoppaddiProduct, variant: Variant) {
  const order = new Map((p.attributes ?? []).map((a) => [a.uuid, a.display_order]));
  const rank = (v: Variant["values"][number]) => order.get(v.attributeValue.attribute_uuid) ?? 0;
  return [...variant.values].sort((a, b) => rank(a) - rank(b)).map((v) => v.attributeValue.value).join(", ");
}

function toResult(p: ChoppaddiProduct, v: Vendor, area: string, variant?: Variant): ProductResult {
  const shop = toShop(v, area);
  const category: Category = isFood(p.categories, v.vendor_type) ? "food" : "grocery";
  const product: Product = {
    id: toId(v, p, variant),
    shopId: v.uuid,
    name: variant ? `${p.name} (${variantName(p, variant)})` : p.name,
    category,
    description: p.description ?? "",
    unit: unitOf(p.name),
    size: null,
    price: variant?.price ?? (p.discount && p.discount_price ? p.discount_price : p.price),
    // A variant without stock_quantity isn't counted, so it counts as in stock while active.
    inStock: p.stock && !p.deleted_at && (!variant || (variant.is_active && (variant.stock_quantity ?? 1) > 0)),
  };
  const minutes = Number.parseInt(p.processing_time ?? "", 10);
  return { ...product, shop, etaMinutes: Number.isFinite(minutes) ? minutes : shop.avgPrepMinutes, etaKind: "preparation" };
}

const NOT_CONNECTED = "Choppaddi orders go through its own checkout (handoff)";

export function choppaddiAdapter(config: ChoppaddiConfig): StoreAdapter {
  if (typeof config.apiUrl !== "string" || !config.apiUrl) throw new Error("Choppaddi adapter_config needs apiUrl");
  const api = config.apiUrl.replace(/\/$/, "");

  async function get<T>(path: string): Promise<T | null> {
    const res = await fetch(`${api}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Choppaddi ${path}: HTTP ${res.status}`);
    return ((await res.json()) as { data: T }).data;
  }

  // Vendors change rarely; reload at most once a minute.
  let vendors: { at: number; byUuid: Map<string, Vendor> } | null = null;
  async function getVendors() {
    if (!vendors || Date.now() - vendors.at > VENDORS_TTL_MS) {
      const all: Vendor[] = [];
      for (let page = 1; ; page++) {
        const data = await get<{ vendors: Vendor[]; pagination: { nextPage: number | null } }>(`/vendor/public/approved?perPage=100&page=${page}`);
        all.push(...(data?.vendors ?? []));
        if (!data?.pagination.nextPage) break;
      }
      vendors = { at: Date.now(), byUuid: new Map(all.map((v) => [v.uuid, v])) };
    }
    return vendors.byUuid;
  }

  async function getFull(slug: string, uuid: string) {
    return (await get<{ product: ChoppaddiProduct }>(`/product/${encodeURIComponent(slug)}/${encodeURIComponent(uuid)}`))?.product ?? null;
  }

  // A product sold in variants is offered once per variant, since checkout needs the variant.
  // Search results don't list variants, so those products are read in full.
  async function withVariants(p: ChoppaddiProduct, v: Vendor, area: string): Promise<ProductResult[]> {
    if (!p.has_variants) return [toResult(p, v, area)];
    const full = p.variants ? p : await getFull(v.slug, p.uuid);
    return (full?.variants ?? []).map((variant) => toResult(full!, v, area, variant));
  }

  return {
    guestCheckout: false,
    checkout: "handoff",

    async searchProducts({ query, area, limit = 20 }) {
      const [data, byUuid] = await Promise.all([
        get<{ products: ChoppaddiProduct[] }>(`/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(area)}&country=Nigeria`),
        getVendors(),
      ]);
      const found = (data?.products ?? [])
        .flatMap((p) => {
          const v = byUuid.get(p.vendor_uuid);
          return v ? [{ p, v }] : []; // only approved vendors
        })
        .slice(0, limit);
      return (await Promise.all(found.map(({ p, v }) => withVariants(p, v, area)))).flat().slice(0, limit);
    },

    async getProduct(id, area) {
      const [slug, uuid, variantUuid] = id.split(":");
      if (!slug || !uuid) return null;
      const [p, byUuid] = await Promise.all([getFull(slug, uuid), getVendors()]);
      const v = p && byUuid.get(p.vendor_uuid);
      if (!v) return null;
      // Products sold in variants can only be ordered as one of them.
      if (!p.has_variants) return variantUuid ? null : toResult(p, v, area);
      const variant = p.variants?.find((x) => x.uuid === variantUuid);
      return variant ? toResult(p, v, area, variant) : null;
    },

    async listShops(area) {
      return [...(await getVendors()).values()].filter((v) => inArea(v, area)).map((v) => toShop(v, area));
    },

    handoff(items) {
      const carts = new Map<string, HandoffCart>();
      for (const item of items) {
        const [vendorSlug, productId, variantId] = item.productId.split(":");
        let cart = carts.get(item.shopId);
        if (!cart) carts.set(item.shopId, (cart = { vendorId: item.shopId, vendorSlug, items: [] }));
        cart.items.push({ productId: productId!, quantity: item.quantity, ...(variantId && { variantId }) });
      }
      return [...carts.values()];
    },

    async createOrder(): Promise<Order[]> {
      throw new Error(NOT_CONNECTED);
    },
    async confirmOrder(): Promise<Order> {
      throw new Error(NOT_CONNECTED);
    },
    async getOrder() {
      return null;
    },
    async getPaymentStatus() {
      return null;
    },
    async getDeliveryEta() {
      return null;
    },
  };
}
