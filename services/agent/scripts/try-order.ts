// A 4-item shopping list becomes a correct cart and a confirmed test order through the real agent
// loop, pressing Confirm the way the widget does. Then asks about payment and delivery.
// Usage: pnpm --filter @talk2buy/agent try-order [--model spark|wonder|spark-open]

import { confirmOrder, sql } from "@talk2buy/tools";
import { runAgent, type AgentEvent } from "../src/agent";
import type { ModelId } from "../src/models";

const model = (process.argv.includes("--model") ? process.argv[process.argv.indexOf("--model") + 1] : "spark") as ModelId;
const sessionId = `try-order-${Date.now()}`;
const base = { sessionId, projectId: "sample", area: "Asaba", model, now: new Date(`${new Date().toISOString().slice(0, 10)}T10:00:00+01:00`) };

const turns = [
  "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent.",
  "Make the tomato paste 3 tins.",
  "Okay, order am.",
];

let orders: Extract<AgentEvent, { type: "orders" }>["orders"] = [];
async function chat(message: string) {
  const events: string[] = [];
  const { reply, toolCalls } = await runAgent({ ...base, message }, (e) => {
    if (e.type === "cart") events.push(`cart ₦${e.cart.total}`);
    if (e.type === "orders") (orders = e.orders), events.push(`orders ${e.orders.map((o) => o.order_id).join(",")} ₦${e.total}`);
  });
  console.log(`> ${message}`);
  console.log(`   tools:  ${toolCalls.map((t) => `${t.name} ${JSON.stringify(t.args)}`).join(" → ") || "(none)"}`);
  console.log(`   events: ${events.join(" | ") || "(none)"}`);
  console.log(`   reply:  ${reply.replace(/\n+/g, " / ")}\n`);
}

for (const message of turns) await chat(message);
for (const o of orders) console.log(`Confirm button → ${o.order_id}: ${(await confirmOrder(o.order_id, base))?.status ?? "not found"}\n`);
if (orders.length) {
  await chat("My money don enter?");
  await new Promise((r) => setTimeout(r, 16_000)); // the sample store's simulated payment
  await chat("My money don enter now? When e go reach?");
}
console.log(orders.length ? "Order flow complete" : "No orders were created");

await sql`delete from conversations where session_id = ${sessionId}`;
await sql`delete from carts where session_id = ${sessionId}`;
await sql.end();
