// Runs every build_cart case in eval/requests.jsonl against the sample store, using the eval's
// expected arguments as if the model had produced them. Then walks one cart through
// update_cart, create_order and confirmOrder, the "Done when" check for Day 4.

import { readFileSync } from "node:fs";
import { sql } from "../src/db";
import { buildCart, confirmOrder, createOrder, updateCart, type BuildCartArgs, type CartView } from "../src/tools/cart";
import type { ToolContext } from "../src/tools/products";

type EvalCase = {
  id: string;
  context: { area: string; now: string };
  expected: { tool: string | null; args?: BuildCartArgs };
};

// Eval times are Nigerian time (UTC+1) on today's date.
const at = (hhmm: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hhmm}:00+01:00`);

const cases = readFileSync(new URL("../../../eval/requests.jsonl", import.meta.url), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line) as EvalCase)
  .filter((c) => c.expected.tool === "build_cart");

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
function show(cart: CartView) {
  for (const s of cart.shops) {
    console.log(`   ${s.shop} (${s.eta_minutes} mins): ${naira(s.subtotal)}`);
    for (const i of s.items) console.log(`      ${i.quantity} × ${i.name} @ ${naira(i.price)} = ${naira(i.line_total)}${i.note ? `  — ${i.note}` : ""}`);
  }
  if (cart.items_not_found.length) console.log(`   not found: ${cart.items_not_found.map((n) => n.query).join(", ")}`);
  console.log(`   total ${naira(cart.total)}`);
}

let failed = 0;
for (const c of cases) {
  const ctx: ToolContext = { projectId: "sample", sessionId: `try-cart-${c.id}`, area: c.context.area, now: at(c.context.now) };
  const cart = await buildCart(c.expected.args!, ctx);
  if ("error" in cart) throw new Error(cart.error);
  const placed = cart.shops.reduce((n, s) => n + s.items.length, 0) + cart.items_not_found.length;
  const ok = placed === c.expected.args!.items.length;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${c.id} [${c.context.area} ${c.context.now}] ${c.expected.args!.items.map((i) => i.query).join(", ")}`);
  show(cart);
}
console.log(`\n${cases.length - failed}/${cases.length} lists fully accounted for (each item in the cart or not found)\n`);

// G13 end to end: build, change, order, confirm.
const ctx: ToolContext = { projectId: "sample", sessionId: "try-cart-flow", area: "Asaba", now: at("10:00") };
const g13 = cases.find((c) => c.id === "G13")!.expected.args!;
await buildCart(g13, ctx);
const updated = await updateCart({ changes: [{ query: "tomato paste", quantity: 3 }, { query: "sugar", quantity: 1 }] }, ctx);
if ("error" in updated) throw new Error(updated.error);
console.log("Flow: G13 cart, then 3 tins of tomato paste and add sugar");
show(updated);

const result = await createOrder({}, ctx);
if ("error" in result || result.status !== "awaiting_confirmation") throw new Error(JSON.stringify(result));
console.log(`create_order: ${result.orders.map((o) => `${o.order_id} ${o.shop} ${naira(o.total)}`).join(" | ")}; total ${naira(result.total)}`);
console.log(`   matches cart total: ${result.total === updated.total}`);

const first = result.orders[0]!.order_id;
console.log(`confirm from another session: ${(await confirmOrder(first, { ...ctx, sessionId: "someone-else" })) ? "ALLOWED (bug)" : "refused"}`);
for (const o of result.orders) console.log(`confirm ${o.order_id}: ${(await confirmOrder(o.order_id, ctx))?.status}`);
console.log(`confirm again: ${await confirmOrder(first, ctx).catch((e: Error) => `refused (${e.message})`)}`);
const next = await updateCart({ changes: [{ query: "bread", quantity: 1 }] }, ctx);
console.log(`after ordering, a new cart starts: ${"cart_id" in next && next.cart_id !== updated.cart_id}`);

await sql`delete from carts where session_id like 'try-cart-%'`;
await sql.end();
