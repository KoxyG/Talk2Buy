// The chat panel: messages, product cards, cart, orders with the Confirm button, and payment
// status. Everything shown about products and money comes from server events.

import { useEffect, useRef, useState } from "preact/hooks";
import { confirmOrder, orderStatus, sendFeedback, sendMessage, type CartView, type ChatEvent, type Client, type OrderSummary, type OrderUpdate, type ProductCard, type Rating } from "./api";
import { getStrings, naira, type Language, type Strings } from "./i18n";

export type Entry =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; rating?: Rating }
  | { kind: "error"; text: string }
  | { kind: "products"; products: ProductCard[]; note?: string }
  | { kind: "cart"; cart: CartView }
  | { kind: "orders"; orders: OrderSummary[]; total: number };

export type AppProps = Client & {
  language: Language;
  area?: string;
  areas?: string[];
  title?: string;
  // Thumbs up/down under each reply, e.g. while testing with real customers.
  feedback?: boolean;
  // Asks from outside the widget, e.g. example buttons on the host page.
  onAsk?: (ask: (text: string) => void) => () => void;
};

const MAX_SAVED_ENTRIES = 60;
const STATUS_POLL_MS = 4000;
const STATUS_POLL_LIMIT_MS = 3 * 60_000;

// Remembered per browser so a page reload keeps the conversation. Storage may be unavailable
// (private mode, blocked cookies); the widget then simply starts fresh.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function App(props: AppProps) {
  const t = getStrings(props.language);
  const key = (name: string) => `talk2buy:${props.projectId}:${name}`;

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(() => load(key("entries"), []));
  const [sessionId, setSessionId] = useState<string | undefined>(() => load(key("session"), undefined));
  const [area, setArea] = useState<string>(() => props.area ?? load(key("area"), ""));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, OrderUpdate>>({});
  const [confirming, setConfirming] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => save(key("entries"), entries.slice(-MAX_SAVED_ENTRIES)), [entries]);
  useEffect(() => save(key("session"), sessionId), [sessionId]);
  useEffect(() => save(key("area"), area), [area]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries, open, busy]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setOpen(true);
    if (!area) {
      // Keep the message ready to send once a city is chosen.
      setInput(message);
      setEntries((e) => {
        const last = e[e.length - 1];
        return last?.kind === "error" && last.text === t.pickCity ? e : [...e, { kind: "error", text: t.pickCity }];
      });
      return;
    }
    setInput("");
    setBusy(true);
    setEntries((e) => [...e, { kind: "user", text: message }]);

    // Text that follows a card starts a new bubble; text right after text joins it.
    const onEvent = (event: ChatEvent) => {
      if (event.type === "session") return setSessionId(event.session_id);
      setEntries((list) => {
        const last = list[list.length - 1];
        switch (event.type) {
          case "text":
            if (last?.kind === "assistant") return [...list.slice(0, -1), { ...last, text: last.text + event.delta }];
            return event.delta.trim() ? [...list, { kind: "assistant", text: event.delta.trimStart() }] : list;
          case "products":
            return event.products.length ? [...list, { kind: "products", products: event.products, note: event.note }] : list;
          case "cart":
            return [...list, { kind: "cart", cart: event.cart }];
          case "orders":
            return [...list, { kind: "orders", orders: event.orders, total: event.total }];
          case "error":
            return [...list, { kind: "error", text: t.error }];
        }
      });
    };

    try {
      await sendMessage(props, { session_id: sessionId, message, area }, onEvent);
    } catch {
      setEntries((e) => [...e, { kind: "error", text: t.error }]);
    } finally {
      setBusy(false);
    }
  }

  // Lets the host page send a message, e.g. from example buttons.
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => props.onAsk?.((text) => askRef.current(text)), []);

  async function refreshStatus() {
    if (!sessionId) return [];
    const updates = await orderStatus(props, sessionId);
    setStatuses((s) => ({ ...s, ...Object.fromEntries(updates.map((u) => [u.order_id, u])) }));
    return updates;
  }

  // Confirm button: confirms every order in the card, then watches payment until it settles.
  async function confirmAll(orders: OrderSummary[]) {
    if (!sessionId) return;
    setConfirming(true);
    try {
      for (const o of orders) {
        if (statuses[o.order_id]?.status !== "pending" && statuses[o.order_id]) continue;
        await confirmOrder(props, sessionId, o.order_id);
      }
    } catch {
      setEntries((e) => [...e, { kind: "error", text: t.error }]);
    } finally {
      setConfirming(false);
    }
    const ids = new Set(orders.map((o) => o.order_id));
    const started = Date.now();
    const poll = async () => {
      const updates = (await refreshStatus()).filter((u) => ids.has(u.order_id));
      const settled = updates.length === ids.size && updates.every((u) => u.payment === "paid" || u.payment === "failed");
      if (!settled && Date.now() - started < STATUS_POLL_LIMIT_MS) setTimeout(poll, STATUS_POLL_MS);
    };
    await poll();
  }

  // Marked as rated straight away; a failed send isn't worth interrupting the chat for.
  function rate(index: number, rating: Rating, comment?: string) {
    const entry = entries[index];
    if (entry?.kind !== "assistant" || !sessionId) return;
    const question = entries.slice(0, index).findLast((e): e is Extract<Entry, { kind: "user" }> => e.kind === "user");
    setEntries((list) => list.map((e, i) => (i === index && e.kind === "assistant" ? { ...e, rating } : e)));
    sendFeedback(props, sessionId, { rating, reply: entry.text, question: question?.text, comment: comment?.trim() || undefined }).catch(() => {});
  }

  // Order cards from an earlier visit show their current status.
  useEffect(() => {
    if (open && entries.some((e) => e.kind === "orders")) void refreshStatus();
  }, [open]);

  const latestCart = entries.findLastIndex((e) => e.kind === "cart");
  const latestOrders = entries.findLastIndex((e) => e.kind === "orders");

  if (!open) {
    return (
      <button class="launcher" type="button" onClick={() => setOpen(true)} aria-label={t.open}>
        <ChatIcon />
        {t.open}
      </button>
    );
  }

  return (
    <div class="panel" role="dialog" aria-label={props.title ?? t.title}>
      <div class="header">
        <div class="avatar" aria-hidden="true"><BagIcon /></div>
        <div class="titles">
          <div class="title">{props.title ?? t.title}</div>
          <div class="subtitle">{t.subtitle}</div>
        </div>
        <button class="icon-button" type="button" onClick={() => setOpen(false)} aria-label={t.close}>
          <CloseIcon />
        </button>
      </div>

      {!props.area && props.areas?.length ? (
        <label class="area">
          {t.deliverTo}
          <select value={area} onChange={(e) => setArea((e.target as HTMLSelectElement).value)}>
            <option value="" disabled>{t.pickCity}</option>
            {props.areas.map((a) => <option value={a}>{a}</option>)}
          </select>
        </label>
      ) : null}

      <div class="log" ref={logRef} aria-live="polite">
        <div class="bubble assistant">{t.greeting}</div>
        {entries.length === 0 && (
          <div class="examples">
            {t.examples.map((x) => <button class="chip" type="button" onClick={() => ask(x)}>{x}</button>)}
          </div>
        )}
        {entries.map((entry, i) => {
          switch (entry.kind) {
            case "user":
            case "error":
              return <div class={`bubble ${entry.kind}`}>{entry.text}</div>;
            case "assistant":
              return (
                <div class="reply">
                  <div class="bubble assistant">{entry.text}</div>
                  {props.feedback && sessionId && !(busy && i === entries.length - 1) && (
                    <Feedback rating={entry.rating} t={t} onRate={(rating, comment) => rate(i, rating, comment)} />
                  )}
                </div>
              );
            case "products":
              return <Products entry={entry} t={t} disabled={busy} onAdd={(p) => ask(t.added(p.name, p.shop))} />;
            case "cart":
              return <Cart cart={entry.cart} t={t} canOrder={i === latestCart && latestOrders < latestCart && entry.cart.total > 0}
                disabled={busy} onOrder={() => ask(t.placeOrderMessage)} />;
            case "orders":
              return <Orders entry={entry} t={t} statuses={statuses} busy={confirming} onConfirm={() => confirmAll(entry.orders)} />;
          }
        })}
        {busy && <div class="typing" aria-hidden="true"><span /><span /><span /></div>}
      </div>

      <form class="composer" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
        <input ref={inputRef} value={input} onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={t.placeholder} aria-label={t.placeholder} maxLength={2000} />
        <button type="submit" disabled={busy || !input.trim()} aria-label={t.send}><SendIcon /></button>
      </form>
    </div>
  );
}

function Products({ entry, t, disabled, onAdd }: { entry: Extract<Entry, { kind: "products" }>; t: Strings; disabled: boolean; onAdd: (p: ProductCard) => void }) {
  return (
    <div>
      <div class="cards">
        {entry.products.map((p) => (
          <div class="product">
            <div class="name">{p.name}</div>
            <div class="meta">{p.shop} · {t.mins(p.eta_minutes)}</div>
            <div class="price">{naira(p.price)}</div>
            <button class="secondary small" type="button" disabled={disabled} onClick={() => onAdd(p)}>{t.add}</button>
          </div>
        ))}
      </div>
      {entry.note && <div class="note">{entry.note}</div>}
    </div>
  );
}

function Cart({ cart, t, canOrder, disabled, onOrder }: { cart: CartView; t: Strings; canOrder: boolean; disabled: boolean; onOrder: () => void }) {
  return (
    <div class="card">
      {cart.shops.map((s) => (
        <div>
          <div class="shop"><span>{s.shop}</span><span>{t.mins(s.eta_minutes)}</span></div>
          {s.items.map((i) => (
            <div class="line"><span>{i.quantity} × {i.name}</span><span>{naira(i.line_total)}</span></div>
          ))}
        </div>
      ))}
      {cart.items_not_found.length > 0 && (
        <div class="missing">{t.notFound}: {cart.items_not_found.map((n) => n.query).join(", ")}</div>
      )}
      <div class="total"><span>{t.total}</span><span>{naira(cart.total)}</span></div>
      {canOrder && <button class="secondary" type="button" disabled={disabled} onClick={onOrder}>{t.placeOrder}</button>}
    </div>
  );
}

function Orders({ entry, t, statuses, busy, onConfirm }: {
  entry: Extract<Entry, { kind: "orders" }>; t: Strings; statuses: Record<string, OrderUpdate>; busy: boolean; onConfirm: () => void;
}) {
  const label = (u?: OrderUpdate) =>
    !u || u.status === "pending" ? { text: t.waitingConfirm, tone: "" }
    : u.payment === "paid" ? { text: t.paid(u.eta_minutes), tone: "paid" }
    : u.payment === "failed" ? { text: t.failed, tone: "failed" }
    : { text: t.waitingPayment, tone: "" };
  const pending = entry.orders.some((o) => !statuses[o.order_id] || statuses[o.order_id]!.status === "pending");
  return (
    <div class="card">
      {entry.orders.map((o) => {
        const status = label(statuses[o.order_id]);
        return (
          <div>
            <div class="shop"><span>{o.shop}</span><span>{naira(o.total)}</span></div>
            <div class={`status ${status.tone}`}>{status.text}</div>
          </div>
        );
      })}
      <div class="total"><span>{t.total}</span><span>{naira(entry.total)}</span></div>
      {pending && <button class="primary" type="button" disabled={busy} onClick={onConfirm}>{busy ? t.confirming : t.confirm}</button>}
    </div>
  );
}

function Feedback({ rating, t, onRate }: { rating?: Rating; t: Strings; onRate: (rating: Rating, comment?: string) => void }) {
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  if (rating) return <div class="feedback-done">{t.feedbackThanks}</div>;
  if (asking) {
    return (
      <form class="feedback-form" onSubmit={(e) => { e.preventDefault(); onRate("down", comment); }}>
        <input value={comment} onInput={(e) => setComment((e.target as HTMLInputElement).value)}
          placeholder={t.feedbackPrompt} aria-label={t.feedbackPrompt} maxLength={1000} />
        <button class="secondary small" type="submit">{t.feedbackSend}</button>
      </form>
    );
  }
  return (
    <div class="feedback">
      <button class="rate" type="button" onClick={() => onRate("up")} aria-label={t.feedbackGood} title={t.feedbackGood}><ThumbUpIcon /></button>
      <button class="rate" type="button" onClick={() => setAsking(true)} aria-label={t.feedbackBad} title={t.feedbackBad}><ThumbDownIcon /></button>
    </div>
  );
}

const ThumbUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
