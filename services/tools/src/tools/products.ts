// search_products and get_product: the only way the model sees products and prices.

import { getAdapter, type Category, type ProductResult } from "../adapters";
import { applyFilters, isOpen, narrowBySize } from "../search/filters";
import { correctSpelling, LOOSE, STRICT, type Correction } from "../search/spelling";

// Set by the server from the session, never by the model.
export type ToolContext = { projectId: string; area: string; now?: Date };

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

export async function searchProducts(args: SearchProductsArgs, ctx: ToolContext): Promise<SearchProductsResult> {
  const adapter = getAdapter(ctx.projectId);
  const filters = { area: ctx.area, category: args.category, maxPrice: args.max_price, maxEtaMinutes: args.max_eta_minutes, now: ctx.now ?? new Date() };
  const find = async (query: string) =>
    applyFilters(await adapter.searchProducts({ query, area: ctx.area, category: args.category, maxPrice: args.max_price, limit: CANDIDATES }), filters);

  let { query, corrections } = await correctSpelling(args.query, STRICT);
  let found = await find(query);

  // One automatic retry with looser spelling correction.
  if (!found.length) {
    const retry = await correctSpelling(args.query, LOOSE);
    if (retry.query !== query) {
      ({ query, corrections } = retry);
      found = await find(query);
    }
  }

  const { results, note } = narrowBySize(found, query);
  return { query, corrections, products: results.slice(0, MAX_RESULTS).map(toCard), ...(note && { note }) };
}

export type GetProductArgs = { product_id: string };

export async function getProduct(args: GetProductArgs, ctx: ToolContext) {
  const p = await getAdapter(ctx.projectId).getProduct(args.product_id, ctx.area);
  if (!p || p.shop.area.toLowerCase() !== ctx.area.toLowerCase()) return { error: "not_found" as const };
  return { ...toCard(p), description: p.description, in_stock: p.inStock, open_now: isOpen(p.shop, ctx.now ?? new Date()) };
}
