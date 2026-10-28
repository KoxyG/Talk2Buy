// Sends single-item and shopping-list requests from eval/requests.jsonl through the real agent
// loop and compares the first search_products or build_cart call with the expected arguments.
// Usage: pnpm --filter @talk2buy/agent try-agent [--model spark|wonder|spark-open] [--only F01,G02]

import { readFileSync } from "node:fs";
import { sql } from "@talk2buy/tools";
import { runAgent } from "../src/agent";
import type { ModelId } from "../src/models";

type EvalCase = {
  id: string;
  request: string;
  context: { area: string; now: string };
  expected: { tool: string | null; args?: Record<string, unknown>; behavior?: string };
};

const arg = (name: string) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const model = (process.argv.includes("--model") ? arg("model") : "spark") as ModelId;
const only = process.argv.includes("--only") ? new Set(arg("only")!.split(",")) : null;

// Eval times are Nigerian time (UTC+1) on today's date.
const at = (hhmm: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hhmm}:00+01:00`);

const cases = readFileSync(new URL("../../../eval/requests.jsonl", import.meta.url), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line) as EvalCase)
  .filter((c) => (only ? only.has(c.id) : ["search_products", "build_cart"].includes(c.expected.tool!) || c.id === "F18"));

// Same filters as expected = pass. Query wording is shown but not scored; the Day 6 eval does that.
const sameFilters = (expected: Record<string, unknown> = {}, actual: Record<string, unknown> = {}) =>
  ["category", "max_price", "max_eta_minutes"].every((k) => (expected[k] ?? null) === (actual[k] ?? null));

// Every expected item has a matching query (one word is enough: "peak milk" ~ "peak") and the
// same quantity when one is expected. Extra items are allowed, for lists like G20.
type Item = { query: string; quantity?: number };
const stem = (q: string) => q.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
const sameItems = (expected: Item[] = [], actual: Item[] = []) =>
  expected.every((e) => actual.some((a) =>
    stem(e.query).some((w) => stem(a.query).includes(w)) && (e.quantity === undefined || (a.quantity ?? 1) === e.quantity)));

let passed = 0;
for (const c of cases) {
  const started = performance.now();
  const { reply, toolCalls } = await runAgent({
    sessionId: `try-agent-${c.id}-${Date.now()}`,
    projectId: "sample",
    area: c.context.area,
    message: c.request,
    model,
    now: at(c.context.now),
  });
  const call = toolCalls.find((t) => t.name === "search_products" || t.name === "build_cart");
  const args = call?.args as Record<string, unknown> | undefined;
  const ok = c.expected.tool === null ? !call
    : call?.name !== c.expected.tool ? false
    : call.name === "build_cart" ? sameItems(c.expected.args?.items as Item[], args?.items as Item[])
    : sameFilters(c.expected.args, args);
  if (ok) passed++;
  console.log(`${ok ? "✓" : "✗"} ${c.id} (${Math.round(performance.now() - started) / 1000}s) ${c.request}`);
  console.log(`   tools:    ${toolCalls.map((t) => `${t.name} ${JSON.stringify(t.args)}`).join(" → ") || "(none)"}`);
  if (!ok) console.log(`   expected: ${c.expected.tool ?? c.expected.behavior} ${JSON.stringify(c.expected.args ?? {})}`);
  console.log(`   reply:    ${reply.replace(/\n+/g, " / ")}\n`);
}
console.log(`${passed}/${cases.length} passed on ${model}`);

// Test conversations are not kept.
await sql`delete from conversations where session_id like 'try-agent-%'`;
await sql`delete from carts where session_id like 'try-agent-%'`;
await sql.end();
