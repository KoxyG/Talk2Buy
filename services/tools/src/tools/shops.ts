// list_shops: the shops that deliver to the customer's city, open or closed. No products or prices.

import { getAdapter } from "../adapters";
import { openStatus } from "../search/filters";
import type { ToolContext } from "./products";

export async function listShops(_args: unknown, ctx: ToolContext) {
  const adapter = await getAdapter(ctx.projectId);
  if (!adapter.listShops) return { error: "This store can't list its shops; search for a product instead." };
  const now = ctx.now ?? new Date();
  const shops = (await adapter.listShops(ctx.area)).map((s) => ({ name: s.name, type: s.type, ...openStatus(s, now) }));
  return { area: ctx.area, shops: [...shops.filter((s) => s.open_now), ...shops.filter((s) => !s.open_now)] };
}
