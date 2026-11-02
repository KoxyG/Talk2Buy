// WhatsApp channel (Meta Cloud API). GET /whatsapp answers Meta's webhook check; POST /whatsapp
// receives messages, runs the same agent as /chat and replies with text, a product list, the cart
// with a "Place order" button and a "Confirm" button. Only the customer's tap confirms an order.
// Each project's number is projects.whatsapp_phone_number_id, and its cities are projects.areas.
// Phone numbers are never stored or logged: chats are keyed by an HMAC of the number, which is
// only used to reply to the message just received.

import { confirmOrder, sql, type CartView, type ProductCard } from "@talk2buy/tools";
import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runAgent } from "./agent";

const GRAPH = "https://graph.facebook.com/v21.0";
const env = (name: string) => process.env[name] ?? "";
const MAX_MESSAGE_LENGTH = 2000;

type Line = { phoneNumberId: string; projectId: string; areas: string[] };
type Incoming = { line: Line; from: string; id: string } & ({ text: string } | { unsupported: true });

// Which project each WhatsApp number serves. Reloaded at most once a minute.
let lines: { at: number; byNumber: Map<string, Line> } | null = null;
async function lineFor(phoneNumberId: string) {
  if (!lines || Date.now() - lines.at > 60_000) {
    const rows = await sql<{ id: string; whatsapp_phone_number_id: string; areas: string[] }[]>`
      select id, whatsapp_phone_number_id, areas from projects where whatsapp_phone_number_id is not null`;
    lines = { at: Date.now(), byNumber: new Map(rows.map((r) => [r.whatsapp_phone_number_id,
      { phoneNumberId: r.whatsapp_phone_number_id, projectId: r.id, areas: r.areas.slice(0, 10) }])) };
  }
  return lines.byNumber.get(phoneNumberId) ?? null;
}

export const whatsapp = new Hono();

// Meta's one-time check when the webhook URL is saved.
whatsapp.get("/", (c) => {
  const q = c.req.query();
  const ok = q["hub.mode"] === "subscribe" && env("WHATSAPP_VERIFY_TOKEN") && q["hub.verify_token"] === env("WHATSAPP_VERIFY_TOKEN");
  return ok ? c.text(q["hub.challenge"] ?? "") : c.text("Forbidden", 403);
});

whatsapp.post("/", async (c) => {
  const raw = await c.req.text();
  if (!signedByMeta(raw, c.req.header("X-Hub-Signature-256"))) return c.text("Forbidden", 403);
  const body = JSON.parse(raw);
  for (const message of await incoming(body)) queue(message);
  return c.text("OK"); // at once: Meta retries webhooks that answer slowly
});

function signedByMeta(raw: string, header: string | undefined) {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Text, plus taps on our list rows and buttons (their ids carry what was tapped). Messages to a
// number no project uses are skipped.
async function incoming(body: any): Promise<Incoming[]> {
  const found: Incoming[] = [];
  for (const change of body?.entry?.flatMap((e: any) => e.changes ?? []) ?? []) {
    const line = await lineFor(String(change.value?.metadata?.phone_number_id ?? ""));
    if (!line) continue;
    for (const m of change.value?.messages ?? []) {
      const tap = m.interactive?.list_reply ?? m.interactive?.button_reply;
      if (m.type === "text") found.push({ line, from: m.from, id: m.id, text: String(m.text?.body ?? "") });
      else if (m.type === "interactive" && tap?.id) found.push({ line, from: m.from, id: m.id, text: `\u0000${tap.id}` });
      else found.push({ line, from: m.from, id: m.id, unsupported: true });
    }
  }
  return found;
}

// Meta can deliver a message twice, and a customer's messages must run one at a time.
const seen = new Set<string>();
const chains = new Map<string, Promise<void>>();
function queue(m: Incoming) {
  if (seen.has(m.id)) return;
  seen.add(m.id);
  if (seen.size > 5000) seen.delete(seen.values().next().value!);
  const key = `${m.line.phoneNumberId}:${m.from}`;
  const next = (chains.get(key) ?? Promise.resolve()).then(() => handle(m)).catch((err) => console.error("WhatsApp:", err));
  chains.set(key, next);
  void next.finally(() => chains.get(key) === next && chains.delete(key));
}

async function handle(m: Incoming) {
  const { line, from: to } = m;
  void send(line, to, { status: "read", message_id: m.id, typing_indicator: { type: "text" } }).catch(() => {});
  if ("unsupported" in m) return sendText(line, to, "I can read text messages for now. Please type what you need.");

  const chat = await chatFor(line, to);
  const tapped = m.text.startsWith("\u0000") ? m.text.slice(1) : null;
  const text = (tapped ? "" : m.text).trim().slice(0, MAX_MESSAGE_LENGTH);

  if (tapped?.startsWith("area:")) {
    const area = tapped.slice(5);
    await sql`update whatsapp_chats set area = ${area}, pending = null, updated_at = now() where session_id = ${chat.session_id}`;
    if (chat.pending) return reply(line, to, { ...chat, area }, chat.pending);
    return sendText(line, to, `Got it, ${area}. What do you need?`);
  }
  if (/^(change|switch) (city|area)$/i.test(text) || (!chat.area && !tapped)) {
    if (!chat.area && text) await sql`update whatsapp_chats set pending = ${text} where session_id = ${chat.session_id}`;
    return askArea(line, to);
  }
  if (tapped === "confirm") return confirmAll(line, to, chat);
  if (tapped === "order") return reply(line, to, chat, "Yes, place the order");
  if (tapped?.startsWith("add:")) return reply(line, to, chat, `Add ${tapped.slice(4)}`);
  if (text) return reply(line, to, chat, text);
}

type Chat = { session_id: string; area: string | null; pending: string | null };

async function chatFor(line: Line, phone: string): Promise<Chat> {
  const hash = createHmac("sha256", env("WHATSAPP_APP_SECRET")).update(phone).digest("hex");
  const [row] = await sql<Chat[]>`
    insert into whatsapp_chats (phone_hash, project_id, session_id)
    values (${hash}, ${line.projectId}, ${crypto.randomUUID()})
    on conflict (phone_hash, project_id) do update set updated_at = now()
    returning session_id, area, pending`;
  return row!;
}

// Runs the agent and sends what the widget would show: the reply, products to add, the cart, and
// a Confirm button once orders wait for it.
async function reply(line: Line, to: string, chat: Chat, message: string) {
  let text = "";
  const products: ProductCard[] = [];
  let cart: CartView | null = null;
  let orders: { total: number; count: number } | null = null;
  try {
    await runAgent({ sessionId: chat.session_id, projectId: line.projectId, area: chat.area!, message }, (e) => {
      if (e.type === "text") text += e.delta;
      if (e.type === "products") products.push(...e.products);
      if (e.type === "cart") cart = e.cart;
      if (e.type === "orders") orders = { total: e.total, count: e.orders.length };
    });
  } catch (err) {
    console.error("WhatsApp agent:", err);
    return sendText(line, to, "Something went wrong. Please try again.");
  }
  if (text.trim()) await sendText(line, to, toWhatsApp(text));
  const waiting = orders as { total: number; count: number } | null;
  if (waiting) {
    const what = waiting.count > 1 ? `${waiting.count} orders` : "your order";
    return sendButtons(line, to, `Confirm ${what}, total ${naira(waiting.total)}?`, [["confirm", "Confirm order"]]);
  }
  if (cart) return sendCart(line, to, cart);
  if (products.length) return sendProducts(line, to, products.slice(0, 10));
}

async function confirmAll(line: Line, to: string, chat: Chat) {
  const [cart] = await sql<{ order_ids: string[] }[]>`
    select order_ids from carts where project_id = ${line.projectId} and session_id = ${chat.session_id}
      and cardinality(order_ids) > 0 order by updated_at desc limit 1`;
  if (!cart) return sendText(line, to, "There's no order waiting to be confirmed.");
  const ctx = { projectId: line.projectId, sessionId: chat.session_id };
  const results = await Promise.all(cart.order_ids.map((id) => confirmOrder(id, ctx).then(() => true, () => false)));
  return sendText(line, to, results.every(Boolean)
    ? "Confirmed ✅ Ask me \"did my payment go through?\" anytime for an update."
    : "Some orders couldn't be confirmed; they may already be confirmed. Ask me for their status.");
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// WhatsApp's bold is *single*; headings mean nothing there.
const toWhatsApp = (text: string) => text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "*$1*").slice(0, 4096);
const etaText = (minutes: number, kind?: string) => (kind === "preparation" ? `${minutes} mins prep` : `${minutes} mins delivery`);

function askArea(line: Line, to: string) {
  const rows = line.areas.map((a) => ({ id: `area:${a}`, title: cut(a, 24) }));
  return send(line, to, { type: "interactive", interactive: { type: "list",
    body: { text: "Hi! Which city are you in?" },
    action: { button: "Choose city", sections: [{ title: "Cities", rows }] } } });
}

function sendProducts(line: Line, to: string, products: ProductCard[]) {
  const rows = products.map((p) => ({ id: cut(`add:${p.name} from ${p.shop}`, 200), title: cut(p.name, 24),
    description: cut(`${naira(p.price)} · ${p.shop} · ${etaText(p.eta_minutes, p.eta_kind)}`, 72) }));
  return send(line, to, { type: "interactive", interactive: { type: "list",
    body: { text: "Tap one to add it to your cart." },
    action: { button: "See options", sections: [{ title: "Options", rows }] } } });
}

function sendCart(line: Line, to: string, cart: CartView) {
  const out = cart.shops.flatMap((s) => [`*${s.shop}* · ${etaText(s.eta_minutes, s.eta_kind)}`,
    ...s.items.map((i) => `${i.quantity} × ${i.name} — ${naira(i.line_total)}`)]);
  if (cart.items_not_found.length) out.push(`Not found: ${cart.items_not_found.map((n) => n.query).join(", ")}`);
  out.push(`*Total ${naira(cart.total)}*`);
  return cart.total > 0 ? sendButtons(line, to, `🛒 ${out.join("\n")}`, [["order", "Place order"]]) : sendText(line, to, out.join("\n"));
}

const sendText = (line: Line, to: string, body: string) => send(line, to, { type: "text", text: { body } });

function sendButtons(line: Line, to: string, body: string, buttons: [id: string, title: string][]) {
  return send(line, to, { type: "interactive", interactive: { type: "button", body: { text: cut(body, 1024) },
    action: { buttons: buttons.map(([id, title]) => ({ type: "reply", reply: { id, title } })) } } });
}

// Replies always go out from the number the customer wrote to.
async function send(line: Line, to: string, message: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${line.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...("status" in message ? {} : { to }), ...message }),
    signal: AbortSignal.timeout(15_000),
  });
  // Status and error code only: the body would include the customer's number.
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
    console.error("WhatsApp send failed:", res.status, body?.error?.code);
  }
}
