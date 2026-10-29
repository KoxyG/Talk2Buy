// search_products and get_product: the only way the model sees products and prices.

import { getAdapter, type Category, type ProductResult } from "../adapters";
import { applyFilters, isOpen, narrowBySize, stripUnitWords } from "../search/filters";
import { correctSpelling, LOOSE, STRICT, type Correction } from "../search/spelling";

// Set by the server from the session, never by the model. budget limits slow lookups per message.
// userToken is the host's short-lived token for a logged-in customer.
export type ToolContext = {
  projectId: string;
  sessionId: string;
  area: string;
  now?: Date;
  budget?: { webLookups: number };
  userToken?: string;
};

const MAX_RESULTS = 5;
const CANDIDATES = 50; // asked of the store, before filtering

export type ProductCard = {
  id: string;
  name: string;
  shop: string;
  price: number;
  unit: string | null;
  size: number | null;
  eta_minutes: number;
};

const toCard = (p: ProductResult): ProductCard =>
  ({ id: p.id, name: p.name, shop: p.shop.name, price: p.price, unit: p.unit, size: p.size, eta_minutes: p.etaMinutes });

export type SearchProductsArgs = { query: string; category?: Category; max_price?: number; max_eta_minutes?: number };
export type SearchProductsResult = { query: string; corrections: Correction[]; products: ProductCard[]; note?: string };

export type FoundProducts = { query: string; corrections: Correction[]; results: ProductResult[]; note?: string };

// The search behind search_products and build_cart: spelling correction, store search, filters,
// and size narrowing. Results keep full product and shop details.
export async function findProducts(args: SearchProductsArgs, ctx: ToolContext): Promise<FoundProducts> {
  const adapter = getAdapter(ctx.projectId);
  const filters = { area: ctx.area, category: args.category, maxPrice: args.max_price, maxEtaMinutes: args.max_eta_minutes, now: ctx.now ?? new Date() };
  // anyCategory ignores the model's category; passing undefined would fall back to it.
  const find = async (query: string, anyCategory = false) => {
    const category = anyCategory ? undefined : args.category;
    return applyFilters(await adapter.searchProducts({ query, area: ctx.area, category, maxPrice: args.max_price, limit: CANDIDATES }), { ...filters, category });
  };

  let { query, corrections } = await correctSpelling(args.query, STRICT);
  let found = await find(query);
  let note: string | undefined;

  // One automatic retry with looser spelling correction.
  if (!found.length) {
    const retry = await correctSpelling(args.query, LOOSE);
    if (retry.query !== query) {
      ({ query, corrections } = retry);
      found = await find(query);
    }
  }

  // Pack words the store doesn't use ("spaghetti pack"): retry without them. The size note
  // below still tells the customer.
  if (!found.length) {
    const plain = stripUnitWords(query);
    if (plain && plain !== query) found = await find(plain);
  }

  // A wrong category must not hide products: retry once across all categories.
  if (!found.length && args.category) {
    found = await find(query, true);
    if (found.length) note = `Nothing under ${args.category}; these are from other categories.`;
  }

  const narrowed = narrowBySize(found, query);
  note = [note, narrowed.note].filter(Boolean).join(" ") || undefined;
  return { query, corrections, results: narrowed.results, ...(note && { note }) };
}

export async function searchProducts(args: SearchProductsArgs, ctx: ToolContext): Promise<SearchProductsResult> {
  const { results, ...rest } = await findProducts(args, ctx);
  return { ...rest, products: results.slice(0, MAX_RESULTS).map(toCard) };
}

export type GetProductArgs = { product_id: string };

export async function getProduct(args: GetProductArgs, ctx: ToolContext) {
  const p = await getAdapter(ctx.projectId).getProduct(args.product_id, ctx.area);
  if (!p || p.shop.area.toLowerCase() !== ctx.area.toLowerCase()) return { error: "not_found" as const };
  return { ...toCard(p), description: p.description, in_stock: p.inStock, open_now: isOpen(p.shop, ctx.now ?? new Date()) };
}
