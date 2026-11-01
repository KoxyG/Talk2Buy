// Choppaddi, read through its public API exactly as it is. Built per project from adapter_config:
//   { "apiUrl": "https://testnet.choppaddi.cloud/api/v1" }
// Read-only for now: search and product details work; ordering needs Choppaddi API keys and the
// customer's Choppaddi login, so ordersConnected is false and create_order sends the customer to
// Choppaddi's own site. The order methods still throw if anything reaches them.
// Choppaddi publishes preparation times but no delivery times, so ETAs are preparation only
// (etaKind "preparation").

import type { Category, Day, Order, Product, ProductResult, Shop, StoreAdapter } from "./types";

export type ChoppaddiConfig = { apiUrl: string };

const TIMEOUT_MS = 15_000;
const VENDORS_TTL_MS = 60_000;

type Vendor = {
  uuid: string; slug: string; name: string; vendor_type: string | null; categories: string[] | null;
  address: string | null; city: string | null; state: string | null;
  opening_time: string | null; closing_time: string | null; business_days: string[] | null; preparation_time: number | null;
};
type ChoppaddiProduct = {
  uuid: string; vendor_uuid: string; name: string; description: string | null; categories: string[] | null;
  price: number; discount: number | null; discount_price: number | null; processing_time: string | null;
  stock: boolean; deleted_at: string | null;
};

const DAYS: Record<string, Day> = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

// "6:30 AM" -> "06:30", "11:30 PM" -> "23:30".
function to24h(time: string | null): string | null {
  const m = time?.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
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
    for (const d of v.business_days ?? []) {
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

// IDs carry the vendor slug, because Choppaddi looks products up by vendor and product together.
const toId = (v: Vendor, p: ChoppaddiProduct) => `${v.slug}:${p.uuid}`;

function toResult(p: ChoppaddiProduct, v: Vendor, area: string): ProductResult {
  const shop = toShop(v, area);
  const category: Category = isFood(p.categories, v.vendor_type) ? "food" : "grocery";
  const product: Product = {
    id: toId(v, p),
    shopId: v.uuid,
    name: p.name,
    category,
    description: p.description ?? "",
    unit: unitOf(p.name),
    size: null,
    price: p.discount && p.discount_price ? p.discount_price : p.price,
    inStock: p.stock && !p.deleted_at,
  };
  const minutes = Number.parseInt(p.processing_time ?? "", 10);
  return { ...product, shop, etaMinutes: Number.isFinite(minutes) ? minutes : shop.avgPrepMinutes, etaKind: "preparation" };
}

const NOT_CONNECTED = "Ordering through Choppaddi isn't connected yet";

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

  return {
    guestCheckout: false,
    ordersConnected: false,

    async searchProducts({ query, area, limit = 20 }) {
      const [data, byUuid] = await Promise.all([
        get<{ products: ChoppaddiProduct[] }>(`/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(area)}&country=Nigeria`),
        getVendors(),
      ]);
      return (data?.products ?? [])
        .flatMap((p) => {
          const v = byUuid.get(p.vendor_uuid);
          return v ? [toResult(p, v, area)] : []; // only approved vendors
        })
        .slice(0, limit);
    },

    async getProduct(id, area) {
      const [slug, uuid] = id.split(":");
      if (!slug || !uuid) return null;
      const [data, byUuid] = await Promise.all([
        get<{ product: ChoppaddiProduct }>(`/product/${encodeURIComponent(slug)}/${encodeURIComponent(uuid)}`),
        getVendors(),
      ]);
      const v = data && byUuid.get(data.product.vendor_uuid);
      return v ? toResult(data.product, v, area) : null;
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
