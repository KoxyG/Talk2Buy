// Runs every search_products case in eval/requests.jsonl against the sample store, using the
// eval's expected arguments as if the model had produced them, plus a few typo cases.
// Checks the tools layer only; model accuracy is measured by the Day 6 eval.

import { readFileSync } from "node:fs";
import { sql } from "../src/db";
import { searchProducts, type SearchProductsArgs } from "../src/tools/products";

type EvalCase = {
  id: string;
  request: string;
  context: { area: string; now: string };
  expected: { tool: string | null; args?: SearchProductsArgs };
};

// Eval times are Nigerian time (UTC+1) on today's date.
const at = (hhmm: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hhmm}:00+01:00`);

const cases = readFileSync(new URL("../../../eval/requests.jsonl", import.meta.url), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line) as EvalCase)
  .filter((c) => c.expected.tool === "search_products");

const typos: [string, SearchProductsArgs, string][] = [
  ["jolof rice", { query: "jolof rice", category: "food" }, "Asaba"],
  ["indomi carton", { query: "indomi carton", category: "grocery" }, "Enugu"],
  ["swalow", { query: "swalow", category: "food" }, "Enugu"],
  ["detegent", { query: "detegent", category: "grocery" }, "Enugu"],
];

let empty = 0;
for (const c of cases) {
  const r = await searchProducts(c.expected.args!, { projectId: "sample", sessionId: "try-search", area: c.context.area, now: at(c.context.now) });
  if (!r.products.length) empty++;
  console.log(`${c.id} [${c.context.area} ${c.context.now}] ${c.expected.args!.query}`);
  console.log(`   ${r.products.map((p) => `${p.name} ₦${p.price} ${p.eta_minutes}m`).join(" | ") || "(none)"}${r.note ? `  — ${r.note}` : ""}`);
}
console.log(`\n${cases.length - empty}/${cases.length} search cases returned products\n`);

for (const [label, args, area] of typos) {
  const r = await searchProducts(args, { projectId: "sample", sessionId: "try-search", area, now: at("13:00") });
  const fixed = r.corrections.map((c) => `${c.from}→${c.to}`).join(", ") || "none";
  console.log(`typo "${label}" [${area}]: corrected ${fixed}; ${r.products.map((p) => p.name).join(" | ") || "(none)"}`);
}

await sql.end();
