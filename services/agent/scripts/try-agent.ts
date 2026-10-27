// Day 3 check: sends single-item requests from eval/requests.jsonl through the real agent loop
// and compares the first search_products call with the expected arguments.
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
  .filter((c) => (only ? only.has(c.id) : c.expected.tool === "search_products" || c.id === "F18"));

// Same filters as expected = pass. Query wording is shown but not scored; the Day 6 eval does that.
const sameFilters = (expected: Record<string, unknown> = {}, actual: Record<string, unknown> = {}) =>
  ["category", "max_price", "max_eta_minutes"].every((k) => (expected[k] ?? null) === (actual[k] ?? null));

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
  const search = toolCalls.find((t) => t.name === "search_products")?.args as Record<string, unknown> | undefined;
  const ok = c.expected.tool === null ? !search : !!search && sameFilters(c.expected.args, search);
  if (ok) passed++;
  console.log(`${ok ? "✓" : "✗"} ${c.id} (${Math.round(performance.now() - started) / 1000}s) ${c.request}`);
  console.log(`   tools:    ${toolCalls.map((t) => `${t.name} ${JSON.stringify(t.args)}`).join(" → ") || "(none)"}`);
  if (!ok) console.log(`   expected: ${c.expected.tool ?? c.expected.behavior} ${JSON.stringify(c.expected.args ?? {})}`);
  console.log(`   reply:    ${reply.replace(/\n+/g, " / ")}\n`);
}
console.log(`${passed}/${cases.length} passed on ${model}`);

// Test conversations are not kept.
await sql`delete from conversations where session_id like 'try-agent-%'`;
await sql.end();
