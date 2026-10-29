// Scores one agent turn against an eval case. Every check is a plain rule, so a run costs only
// the agent's own model calls. A check that doesn't apply to a case is null, not a pass.

import type { AgentResult } from "@talk2buy/agent";

export type EvalCase = {
  id: string;
  lang: "en" | "pcm";
  category: "food" | "grocery" | "status";
  slang: boolean;
  request: string;
  context: { area: string; now: string };
  expected: { tool: string | null; args?: Record<string, unknown>; behavior?: string };
};

export type Scores = {
  tool: boolean; // the first main tool call is the expected one (or only read-only checks, when none is expected)
  filters: boolean | null; // search_products: same category, max_price and max_eta_minutes
  query: boolean | null; // search_products: the query shares a word with the expected one
  cart: boolean | null; // build_cart: every expected item, with its quantity
  behavior: boolean | null; // no-tool cases: asks a question, refuses refunds, points to Confirm
  inventedPrices: number[]; // ₦ amounts in the reply found in no tool result or the request
  correct: boolean;
};

// Tools that answer the request. lookup_term and get_product may come first; they are helpers.
const MAIN_TOOLS = ["search_products", "build_cart", "update_cart", "create_order", "get_payment_status", "get_delivery_eta"];
// When no tool is expected (a refund request, "I want food"), checking these first is still fine.
const READ_ONLY = ["get_payment_status", "get_delivery_eta", "lookup_term"];

const words = (q: string) => q.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
const sharesWord = (expected: string, actual: string) => words(expected).some((w) => words(actual).includes(w));

const sameFilters = (expected: Record<string, unknown>, actual: Record<string, unknown>) =>
  ["category", "max_price", "max_eta_minutes"].every((k) => (expected[k] ?? null) === (actual[k] ?? null));

// Extra items are allowed, for lists like G20 ("ingredients for jollof").
type Item = { query: string; quantity?: number };
const sameItems = (expected: Item[], actual: Item[]) =>
  expected.every((e) => actual.some((a) => sharesWord(e.query, a.query) && (e.quantity === undefined || (a.quantity ?? 1) === e.quantity)));

const BEHAVIORS: Record<string, (reply: string) => boolean> = {
  ask_one_clarifying_question: (r) => r.includes("?"),
  explain_cannot_move_money: (r) => /refund|can'?t|cannot|no fit|not able|unable/i.test(r),
  // With no order yet, "I can't confirm it for you" is enough; the button only exists after an order.
  point_to_confirm_button: (r) => /confirm/i.test(r) && /button|can'?t|cannot|no fit|only you|yourself/i.test(r),
};

// Naira amounts: "₦3,000", "N3000", "3k". Amounts the customer wrote may be repeated back.
function amounts(text: string): number[] {
  const found: number[] = [];
  for (const m of text.matchAll(/(?:₦|\bN)\s?(\d[\d,]*(?:\.\d+)?)(\s?[kK]\b)?/g)) {
    found.push(Number(m[1]!.replace(/,/g, "")) * (m[2] ? 1000 : 1));
  }
  for (const m of text.matchAll(/(?<![₦\d])\b(\d+(?:\.\d+)?)\s?k\b/gi)) found.push(Number(m[1]) * 1000);
  return found.filter((n) => Number.isFinite(n) && n > 0);
}
function numbersIn(value: unknown, into = new Set<number>()): Set<number> {
  if (typeof value === "number") into.add(value);
  else if (typeof value === "string") for (const n of amounts(value)) into.add(n);
  else if (value && typeof value === "object") for (const v of Object.values(value)) numbersIn(v, into);
  return into;
}

export function score(c: EvalCase, result: AgentResult): Scores {
  const call = result.toolCalls.find((t) => MAIN_TOOLS.includes(t.name));
  const args = (call?.args ?? {}) as Record<string, unknown>;
  const expectedArgs = c.expected.args ?? {};
  const tool = c.expected.tool === null
    ? result.toolCalls.every((t) => READ_ONLY.includes(t.name))
    : call?.name === c.expected.tool;

  const isSearch = c.expected.tool === "search_products";
  const filters = isSearch ? tool && sameFilters(expectedArgs, args) : null;
  const query = isSearch ? tool && sharesWord(String(expectedArgs.query ?? ""), String(args.query ?? "")) : null;
  const cart = c.expected.tool === "build_cart"
    ? tool && sameItems((expectedArgs.items ?? []) as Item[], (args.items ?? []) as Item[])
    : null;
  const check = c.expected.behavior ? BEHAVIORS[c.expected.behavior] : undefined;
  const behavior = check ? check(result.reply) : null;

  const known = numbersIn(result.toolCalls.map((t) => t.result));
  for (const n of amounts(c.request)) known.add(n);
  for (const m of c.request.matchAll(/\d[\d,]*/g)) known.add(Number(m[0].replace(/,/g, ""))); // "for 1,500"
  const inventedPrices = amounts(result.reply).filter((n) => !known.has(n));

  const correct = tool && [filters, query, cart, behavior].every((s) => s !== false) && inventedPrices.length === 0;
  return { tool, filters, query, cart, behavior, inventedPrices, correct };
}
