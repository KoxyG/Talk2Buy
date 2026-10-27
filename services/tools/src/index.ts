// What the agent uses from this package: tool definitions for the model, and runTool to execute
// whatever the model calls.

import { getProductDefinition, lookupTermDefinition, searchProductsDefinition } from "./tools/definitions";
import { lookupTerm, type LookupTermArgs } from "./tools/lookup-term";
import { getProduct, searchProducts, type GetProductArgs, type SearchProductsArgs, type ToolContext } from "./tools/products";

export { sql } from "./db";
export type { ToolContext } from "./tools/products";
export type { SearchProductsResult, ProductCard } from "./tools/products";

export const toolDefinitions = [searchProductsDefinition, getProductDefinition, lookupTermDefinition];

const tools: Record<string, (args: any, ctx: ToolContext) => Promise<unknown>> = {
  search_products: (args: SearchProductsArgs, ctx) => searchProducts(args, ctx),
  get_product: (args: GetProductArgs, ctx) => getProduct(args, ctx),
  lookup_term: (args: LookupTermArgs, ctx) => lookupTerm(args, ctx),
};

export async function runTool(name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
  const tool = tools[name];
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool(args, ctx);
}
