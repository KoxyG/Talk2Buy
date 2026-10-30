// Talks to the agent API: POST /chat (server-sent events), POST /orders/:id/confirm,
// POST /orders/status, POST /feedback and POST /transcribe. Shapes match services/tools; prices always come from the server.

export type ProductCard = { id: string; name: string; shop: string; price: number; unit: string | null; size: number | null; eta_minutes: number };

export type CartView = {
  cart_id: string;
  shops: {
    shop: string;
    eta_minutes: number;
    items: { product_id: string; name: string; quantity: number; price: number; line_total: number; note?: string }[];
    subtotal: number;
  }[];
  total: number;
  items_not_found: { query: string; reason: string }[];
};

export type OrderSummary = { order_id: string; shop: string; items: { name: string; quantity: number; price: number }[]; total: number };

export type OrderUpdate = {
  order_id: string;
  shop: string;
  total: number;
  status: "pending" | "confirmed" | "paid" | "failed";
  payment: "pending" | "paid" | "failed" | "unknown";
  eta_minutes: number | null;
};

export type ChatEvent =
  | { type: "session"; session_id: string }
  | { type: "text"; delta: string }
  | { type: "products"; products: ProductCard[]; note?: string; corrections: { from: string; to: string }[] }
  | { type: "cart"; cart: CartView }
  | { type: "orders"; orders: OrderSummary[]; total: number }
  | { type: "error"; message: string };

export type Client = { apiUrl: string; projectId: string; getUserToken?: () => Promise<string | null> | string | null };

async function post(client: Client, path: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const userToken = (await client.getUserToken?.()) ?? undefined;
  return fetch(`${client.apiUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: client.projectId, user_token: userToken, ...body }),
    signal,
  });
}

// Streams one customer message. Events arrive in order; "done" ends the stream.
export async function sendMessage(
  client: Client,
  body: { session_id?: string; message: string; area: string; voice?: boolean },
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
) {
  const res = await post(client, "/chat", body, signal);
  if (!res.ok || !res.body) {
    const error = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Request failed (${res.status})`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = block.match(/^event: (.*)$/m)?.[1];
      const data = block.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
      if (!event || !data || event === "done") continue;
      const parsed = JSON.parse(data);
      onEvent(event === "session" || event === "error" ? { type: event, ...parsed } : parsed);
    }
  }
}

export async function confirmOrder(client: Client, sessionId: string, orderId: string): Promise<void> {
  const res = await post(client, `/orders/${encodeURIComponent(orderId)}/confirm`, { session_id: sessionId });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Confirm failed (${res.status})`);
  }
}

export async function orderStatus(client: Client, sessionId: string): Promise<OrderUpdate[]> {
  const res = await post(client, "/orders/status", { session_id: sessionId });
  if (!res.ok) return [];
  return ((await res.json()) as { orders: OrderUpdate[] }).orders;
}

export type Rating = "up" | "down";

export async function sendFeedback(
  client: Client,
  sessionId: string,
  body: { rating: Rating; reply: string; question?: string; comment?: string },
): Promise<void> {
  const res = await post(client, "/feedback", { session_id: sessionId, ...body });
  if (!res.ok) throw new Error(`Feedback failed (${res.status})`);
}

export async function transcribe(client: Client, audio: string): Promise<string> {
  const res = await post(client, "/transcribe", { audio });
  if (!res.ok) throw new Error(`Transcription failed (${res.status})`);
  return ((await res.json()) as { text: string }).text;
}
