// get_payment_status and get_delivery_eta: read-only updates on the customer's own orders, also
// used by the widget's status check. Nothing here can change an order or move money.

import { getAdapter, type OrderStatus, type PaymentStatus } from "../adapters";
import { sql } from "../db";
import { customerFor, type CartItem } from "./cart";
import type { ToolContext } from "./products";

const MAX_CARTS = 3; // recent ordered carts to report on

export type OrderUpdate = {
  order_id: string;
  shop: string;
  items: string[];
  total: number;
  status: OrderStatus;
  payment: PaymentStatus | "unknown";
  eta_minutes: number | null; // only once confirmed
};

export type OrderStatusArgs = { order_id?: string };

// The session's recent orders, newest first; order_id narrows to one of them.
export async function getOrderUpdates(args: OrderStatusArgs, ctx: Pick<ToolContext, "projectId" | "sessionId" | "userToken">):
  Promise<{ orders: OrderUpdate[] } | { error: string }> {
  const customer = customerFor(ctx);
  const carts = await sql<{ order_ids: string[]; items: CartItem[] }[]>`
    select order_ids, items from carts
    where project_id = ${ctx.projectId} and session_id = ${ctx.sessionId} and cardinality(order_ids) > 0
    order by updated_at desc
    limit ${MAX_CARTS}`;
  const owned = carts.flatMap((c) => c.order_ids.map((id) => ({ id, items: c.items })))
    .filter((o) => !args.order_id || o.id === args.order_id);
  if (!customer || !owned.length) return { error: "no_orders: the customer has no orders in this chat" };

  const adapter = getAdapter(ctx.projectId);
  const orders = await Promise.all(owned.map(async ({ id, items }): Promise<OrderUpdate | null> => {
    const [order, payment, eta] = await Promise.all([
      adapter.getOrder(id, customer),
      adapter.getPaymentStatus(id, customer),
      adapter.getDeliveryEta(id, customer),
    ]);
    if (!order) return null;
    return {
      order_id: id,
      shop: items.find((i) => i.shop_id === order.shopId)?.shop ?? order.shopId,
      items: order.items.map((i) => `${i.quantity} × ${i.name}`),
      total: order.total,
      status: order.status,
      payment: payment ?? "unknown",
      eta_minutes: eta,
    };
  }));
  const found = orders.filter((o) => o !== null);
  return found.length ? { orders: found } : { error: "no_orders: the store has no record of these orders" };
}

export async function getPaymentStatus(args: OrderStatusArgs, ctx: ToolContext) {
  const result = await getOrderUpdates(args, ctx);
  if ("error" in result) return result;
  return { orders: result.orders.map(({ eta_minutes, ...o }) => o) };
}

export async function getDeliveryEta(args: OrderStatusArgs, ctx: ToolContext) {
  const result = await getOrderUpdates(args, ctx);
  if ("error" in result) return result;
  return { orders: result.orders.map(({ payment, ...o }) => o) };
}
