// Day 6 evaluation: runs the requests in requests.jsonl through the real agent loop on each model,
// scores every turn (score.ts), saves the rows to eval_runs and writes a results table to
// eval/results/<run_id>.md. Models run side by side; each model's cases run one at a time.
// Usage: pnpm eval [--models spark,wonder,spark-open] [--only F01,G13] [--label note]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runAgent, type AgentResult, type AgentUsage } from "@talk2buy/agent";
import { getModel, type ModelId } from "@talk2buy/agent/models";
import { sql } from "@talk2buy/tools";
import { score, type EvalCase, type Scores } from "./score";

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const models = (arg("models") ?? "spark,wonder,spark-open").split(",") as ModelId[];
const only = arg("only") ? new Set(arg("only")!.split(",")) : null;
const runId = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}${arg("label") ? `-${arg("label")}` : ""}`;

const cases = readFileSync(new URL("../requests.jsonl", import.meta.url), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line) as EvalCase)
  .filter((c) => !only || only.has(c.id));

// Eval times are Nigerian time (UTC+1) on today's date, so shop hours match each case.
const at = (hhmm: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hhmm}:00+01:00`);

type Row = { model: ModelId; case: EvalCase; scores: Scores | null; latencyMs: number; usage: AgentUsage | null; error?: string };

async function runCase(model: ModelId, c: EvalCase): Promise<Row> {
  const started = performance.now();
  let result: AgentResult | null = null;
  let error: string | undefined;
  try {
    result = await runAgent({
      sessionId: `eval-${runId}-${model}-${c.id}`,
      projectId: "sample",
      area: c.context.area,
      message: c.request,
      model,
      now: at(c.context.now),
    });
  } catch (err) {
    error = (err as Error).message;
  }
  const latencyMs = Math.round(performance.now() - started);
  const scores = result ? score(c, result) : null;

  await sql`
    insert into eval_runs (run_id, model, request_id, request, expected, actual, correct, latency_ms)
    values (${runId}, ${model}, ${c.id}, ${c.request}, ${sql.json(c.expected as never)},
      ${sql.json({ tool_calls: result?.toolCalls.map(({ name, args }) => ({ name, args })) ?? [], reply: result?.reply ?? null,
        scores, usage: result?.usage ?? null, error: error ?? null } as never)},
      ${scores?.correct ?? false}, ${latencyMs})`;

  const mark = scores?.correct ? "✓" : "✗";
  console.error(`${mark} ${model.padEnd(10)} ${c.id} ${(latencyMs / 1000).toFixed(1)}s${error ? ` ERROR ${error.slice(0, 120)}` : ""}`);
  return { model, case: c, scores, latencyMs, usage: result?.usage ?? null, error };
}

async function runModel(model: ModelId): Promise<Row[]> {
  const rows: Row[] = [];
  for (const c of cases) rows.push(await runCase(model, c));
  return rows;
}

// The agent logs every model call as JSON on stdout; keep only this script's lines visible.
console.log = () => {};
console.error(`Run ${runId}: ${cases.length} cases × ${models.map((m) => getModel(m).label).join(", ")}`);
const rows = (await Promise.all(models.map(runModel))).flat();

// --- Results table -------------------------------------------------------------------------

const pct = (pass: number, total: number) => (total ? `${Math.round((100 * pass) / total)}% (${pass}/${total})` : "–");
// A request that errored counts as a failure in "correct" and is left out of the other checks.
const rate = (list: Row[], key: keyof Omit<Scores, "inventedPrices">) => {
  const scored = list.filter((r) => (key === "correct" ? true : r.scores && r.scores[key] !== null));
  return pct(scored.filter((r) => r.scores?.[key] === true).length, scored.length);
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0;
};
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const sum = (list: Row[], key: keyof AgentUsage) => list.reduce((n, r) => n + (r.usage?.[key] ?? 0), 0);
const thousands = (n: number) => `${Math.round(n / 1000)}k`;

const lines: string[] = [
  `# Eval run ${runId}`,
  "",
  `${cases.length} requests per model, run ${new Date().toISOString()}. A request is correct when every check that applies passes and the reply has no invented ₦ amounts.`,
  "",
  "| Model | Correct | Tool | Filters | Query | Cart | Behavior | Invented ₦ | Median | p90 | Errors |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
];
for (const model of models) {
  const list = rows.filter((r) => r.model === model);
  const invented = list.filter((r) => r.scores?.inventedPrices.length).length;
  const latencies = list.filter((r) => !r.error).map((r) => r.latencyMs);
  lines.push(`| ${getModel(model).label} | **${rate(list, "correct")}** | ${rate(list, "tool")} | ${rate(list, "filters")} | ${rate(list, "query")} | ${rate(list, "cart")} | ${rate(list, "behavior")} | ${invented} | ${secs(percentile(latencies, 50))} | ${secs(percentile(latencies, 90))} | ${list.filter((r) => r.error).length} |`);
}

lines.push("", "## By language and category", "", `| Model | English | Pidgin | Food | Grocery | Status |`, "|---|---|---|---|---|---|");
for (const model of models) {
  const list = rows.filter((r) => r.model === model);
  const by = (f: (c: EvalCase) => boolean) => rate(list.filter((r) => f(r.case)), "correct");
  lines.push(`| ${getModel(model).label} | ${by((c) => c.lang === "en")} | ${by((c) => c.lang === "pcm")} | ${by((c) => c.category === "food")} | ${by((c) => c.category === "grocery")} | ${by((c) => c.category === "status")} |`);
}

lines.push("", "## Tokens", "", "| Model | Prompt | of which cached | Completion | of which reasoning |", "|---|---|---|---|---|");
for (const model of models) {
  const list = rows.filter((r) => r.model === model);
  lines.push(`| ${getModel(model).label} | ${thousands(sum(list, "promptTokens"))} | ${thousands(sum(list, "cachedTokens"))} | ${thousands(sum(list, "completionTokens"))} | ${thousands(sum(list, "reasoningTokens"))} |`);
}

lines.push("", "## Failures", "");
for (const r of rows.filter((r) => !r.scores?.correct)) {
  const s = r.scores;
  const failed = !s ? [`error: ${r.error?.slice(0, 160)}`] : [
    ...(["tool", "filters", "query", "cart", "behavior"] as const).filter((k) => s[k] === false),
    ...(s.inventedPrices.length ? [`invented ₦${s.inventedPrices.join(", ₦")}`] : []),
  ];
  lines.push(`- **${r.case.id}** on ${getModel(r.model).label} (${failed.join(", ")}): ${r.case.request}`);
}
lines.push("", `Rows: \`select * from eval_runs where run_id = '${runId}'\``);

const report = lines.join("\n") + "\n";
mkdirSync(new URL("../results/", import.meta.url), { recursive: true });
writeFileSync(new URL(`../results/${runId}.md`, import.meta.url), report);
process.stdout.write(`\n${report}`);

// Eval conversations and carts are not kept; the scored rows are in eval_runs.
await sql`delete from conversations where session_id like ${`eval-${runId}-%`}`;
await sql`delete from carts where session_id like ${`eval-${runId}-%`}`;
await sql.end();
