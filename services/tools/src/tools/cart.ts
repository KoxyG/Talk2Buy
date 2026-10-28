// build_cart, update_cart and create_order. Each session has at most one open cart in Supabase;
// prices and stock always come from the store, never from the model. Confirming is not a model
// tool: only the widget's Confirm button calls confirmOrder.

import { getAdapter, type Customer, type Order, type ProductResult } from "../adapters";
import { sql } from "../db";
import { isOpen } from "../search/filters";
import { findProducts, type ToolContext } from "./products";

const MAX_ITEMS = 20;
const MAX_QUANTITY = 99;
const NOT_FOUND = "No match in shops that deliver to the customer and are open now";

export type CartItem = {
  product_id: string;
  name: string;
  shop_id: string;
  shop: string;
  quantity: number;
  price: number;
  eta_minutes: number;
  note?: string;
};
export type NotFound = { query: string; reason: string };

export type CartView = {
  cart_id: string;
  shops: {
    shop: string;
    eta_minutes: number;
    items: { product_id: string; name: string; quantity: number; price: number; line_total: number; note?: string }[];
    subtotal: number;
  }[];
  total: number;
  items_not_found: NotFound[];
};

type CartRow = { id: string; items: CartItem[]; items_not_found: NotFound[] };

export type RequestedItem = { query: string; quantity?: number; size?: string; unit?: string };
export type BuildCartArgs = { items: RequestedItem[] };
export type UpdateCartArgs = { changes: { product_id?: string; query?: string; quantity: number }[] };

export async function buildCart(args: BuildCartArgs, ctx: ToolContext): Promise<CartView | { error: string }> {
  const requested = (args.items ?? []).slice(0, MAX_ITEMS);
  if (!requested.length) return { error: "items is empty" };
  const items: CartItem[] = [];
  const notFound: NotFound[] = [];
  for (const item of requested) await addItem(item, quantityOf(item.quantity), ctx, items, notFound);
  return view(await saveOpenCart(ctx, items, notFound));
}

// Quantity 0 removes an item. items_not_found only lists what this update couldn't add.
export async function updateCart(args: UpdateCartArgs, ctx: ToolContext): Promise<CartView | { error: string }> {
  const cart = await openCart(ctx);
  const items = cart?.items ?? [];
  const notFound: NotFound[] = [];

  for (const change of args.changes ?? []) {
    const quantity = change.quantity === 0 ? 0 : quantityOf(change.quantity);
    const target = items.find((i) =>
      change.product_id ? i.product_id === change.product_id : !!change.query && nameMatches(i.name, change.query));
    if (target) {
      if (quantity === 0) items.splice(items.indexOf(target), 1);
      else target.quantity = quantity;
    } else if (quantity === 0) {
      continue; // removing something that isn't in the cart
    } else if (change.product_id) {
      const p = await getAdapter(ctx.projectId).getProduct(change.product_id, ctx.area);
      if (p && available(p, ctx)) items.push(toItem(p, quantity));
      else notFound.push({ query: change.product_id, reason: NOT_FOUND });
    } else if (change.query) {
      await addItem({ query: change.query }, quantity, ctx, items, notFound);
    }
  }
  return view(await saveOpenCart(ctx, items, notFound));
}

export type CreateOrderResult =
  | { error: string }
  | { status: "cart_changed"; changes: { name: string; change: "unavailable" | "price"; old_price?: number; new_price?: number }[]; cart: CartView }
  | {
      status: "awaiting_confirmation";
      orders: { order_id: string; shop: string; items: { name: string; quantity: number; price: number }[]; total: number }[];
      total: number;
      next_step: string;
    };

// Turns the open cart into pending orders, one per shop. Nothing is placed until the customer
// presses Confirm.
export async function createOrder(_args: unknown, ctx: ToolContext): Promise<CreateOrderResult> {
  const cart = await openCart(ctx);
  if (!cart?.items.length) return { error: "The cart is empty. Build a cart first." };
  const customer = customerFor(ctx);
  if (!customer) return { error: "login_required: the customer must log in on this site to order" };

  // Prices and stock can change while the customer decides: re-check every item first.
  const adapter = getAdapter(ctx.projectId);
  const changes: Extract<CreateOrderResult, { status: "cart_changed" }>["changes"] = [];
  const items: CartItem[] = [];
  for (const item of cart.items) {
    const p = await adapter.getProduct(item.product_id, ctx.area);
    if (!p || !available(p, ctx)) {
      changes.push({ name: item.name, change: "unavailable" });
      continue;
    }
    if (p.price !== item.price) changes.push({ name: item.name, change: "price", old_price: item.price, new_price: p.price });
    items.push({ ...item, price: p.price, eta_minutes: p.etaMinutes });
  }
  if (changes.length) {
    return { status: "cart_changed", changes, cart: view(await saveOpenCart(ctx, items, cart.items_not_found)) };
  }

  const orders = await adapter.createOrder(items.map((i) => ({ productId: i.product_id, quantity: i.quantity })), customer);
  await sql`update carts set order_ids = ${sql.array(orders.map((o) => o.id))}, updated_at = now() where id = ${cart.id}`;
  const shopNames = new Map(items.map((i) => [i.shop_id, i.shop]));
  return {
    status: "awaiting_confirmation",
    orders: orders.map((o) => ({
      order_id: o.id,
      shop: shopNames.get(o.shopId) ?? o.shopId,
      items: o.items.map(({ name, quantity, price }) => ({ name, quantity, price })),
      total: o.total,
    })),
    total: orders.reduce((sum, o) => sum + o.total, 0),
    next_step: "The customer must press the Confirm button to place these orders.",
  };
}

// Called only by POST /orders/:id/confirm (the widget's Confirm button), never by the model.
// Returns null if the order doesn't belong to this session.
export async function confirmOrder(orderId: string, ctx: Pick<ToolContext, "projectId" | "sessionId" | "userToken">): Promise<Order | null> {
  const customer = customerFor(ctx);
  const [own] = await sql`
    select 1 from carts
    where project_id = ${ctx.projectId} and session_id = ${ctx.sessionId} and ${orderId} = any(order_ids)`;
  if (!own || !customer) return null;
  return getAdapter(ctx.projectId).confirmOrder(orderId, customer);
}

// Logged-in customers order with their own token; guests only where the store allows it.
export function customerFor(ctx: Pick<ToolContext, "projectId" | "sessionId" | "userToken">): Customer | null {
  if (ctx.userToken) return { userToken: ctx.userToken };
  return getAdapter(ctx.projectId).guestCheckout ? { userToken: `guest:${ctx.sessionId}` } : null;
}

async function addItem(item: RequestedItem, quantity: number, ctx: ToolContext, items: CartItem[], notFound: NotFound[]) {
  const found = await pick(item, ctx, new Set(items.map((i) => i.shop_id)));
  if (!found) {
    notFound.push({ query: item.query, reason: NOT_FOUND });
    return;
  }
  // Two requests can resolve to one product ("amala", "ewedu" -> "Amala with ewedu"): count it once.
  const same = items.find((i) => i.product_id === found.product.id);
  if (same) same.quantity = Math.max(same.quantity, quantity);
  else items.push(toItem(found.product, quantity, found.note));
}

// Best match for one requested item. When a shop already in the cart sells an equivalent product
// (same category, unit and size, e.g. another brand's tin of tomato paste), that shop wins, so a
// list isn't split across shops (and delivery fees) to save a few naira.
async function pick(item: RequestedItem, ctx: ToolContext, shopsInCart: Set<string>) {
  const query = [item.size, item.query, item.unit].filter(Boolean).join(" ");
  const { results, note } = await findProducts({ query }, ctx);
  const top = results[0];
  if (!top) return null;
  const sameShop = results.find((p) =>
    shopsInCart.has(p.shopId) && p.category === top.category && p.unit === top.unit && p.size === top.size);
  return { product: sameShop ?? top, note };
}

const toItem = (p: ProductResult, quantity: number, note?: string): CartItem => ({
  product_id: p.id,
  name: p.name,
  shop_id: p.shopId,
  shop: p.shop.name,
  quantity,
  price: p.price,
  eta_minutes: p.etaMinutes,
  ...(note && { note }),
});

const available = (p: ProductResult, ctx: ToolContext) =>
  p.inStock && p.shop.area.toLowerCase() === ctx.area.toLowerCase() && isOpen(p.shop, ctx.now ?? new Date());

const quantityOf = (n: unknown) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(n)) || 1));

// "remove the rice" matches "Local rice, 1kg": every word of the query is in the name.
const nameWords = (text: string) => text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
const nameMatches = (name: string, query: string) => {
  const have = new Set(nameWords(name));
  const want = nameWords(query);
  return want.length > 0 && want.every((w) => have.has(w));
};

function view(cart: CartRow): CartView {
  const shops = new Map<string, CartView["shops"][number]>();
  for (const i of cart.items) {
    let shop = shops.get(i.shop_id);
    if (!shop) shops.set(i.shop_id, (shop = { shop: i.shop, eta_minutes: i.eta_minutes, items: [], subtotal: 0 }));
    const line_total = i.price * i.quantity;
    shop.items.push({ product_id: i.product_id, name: i.name, quantity: i.quantity, price: i.price, line_total, ...(i.note && { note: i.note }) });
    shop.subtotal += line_total;
  }
  const list = [...shops.values()];
  return { cart_id: cart.id, shops: list, total: list.reduce((sum, s) => sum + s.subtotal, 0), items_not_found: cart.items_not_found };
}

async function openCart(ctx: ToolContext): Promise<CartRow | null> {
  const [row] = await sql<CartRow[]>`
    select id, items, items_not_found from carts
    where project_id = ${ctx.projectId} and session_id = ${ctx.sessionId} and cardinality(order_ids) = 0`;
  return row ?? null;
}

async function saveOpenCart(ctx: ToolContext, items: CartItem[], notFound: NotFound[]): Promise<CartRow> {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const [row] = await sql<{ id: string }[]>`
    insert into carts (project_id, session_id, items, total, items_not_found)
    values (${ctx.projectId}, ${ctx.sessionId}, ${sql.json(items as never)}, ${total}, ${sql.json(notFound as never)})
    on conflict (session_id) where cardinality(order_ids) = 0
    do update set items = excluded.items, total = excluded.total, items_not_found = excluded.items_not_found, updated_at = now()
    returning id`;
  return { id: row!.id, items, items_not_found: notFound };
}
