// In-memory store used until the Choppaddi adapter is ready. Its search is deliberately plain
// (word matching on name and description), like a typical store API, so typo correction and
// filtering are exercised by the tools rather than hidden here.

import type { Customer, Order, Product, ProductResult, StoreAdapter } from "../types";
import { products, shops } from "./data";

const shopsById = new Map(shops.map((s) => [s.id, s]));
const productsById = new Map(products.map((p) => [p.id, p]));

function withShop(p: Product): ProductResult {
  const { deliveryMinutes, ...shop } = shopsById.get(p.shopId)!;
  return { ...p, shop, etaMinutes: shop.avgPrepMinutes + deliveryMinutes };
}

// Sizes like "5kg" are skipped: the tools filter on size, not the text search.
// A trailing "s" is dropped so "egg" matches "eggs".
function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !/\d/.test(w))
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w));
}

type StoredOrder = Order & { userToken: string; confirmedAt?: number; etaMinutes: number };
const orders = new Map<string, StoredOrder>();
let nextOrderId = 1;

function ownOrder(orderId: string, customer: Customer): StoredOrder | null {
  const order = orders.get(orderId);
  return order && order.userToken === customer.userToken ? order : null;
}

export const sampleAdapter: StoreAdapter = {
  guestCheckout: true, // the demo page has no login

  async searchProducts({ query, area, category, maxPrice, limit = 20 }) {
    const terms = words(query);
    const minScore = Math.ceil(terms.length * 0.6); // most of the words must match
    return products
      .map((p) => {
        const text = new Set(words(`${p.name} ${p.description}`));
        return { p, score: terms.filter((t) => text.has(t)).length };
      })
      .filter(({ p, score }) =>
        score > 0 && score >= minScore &&
        shopsById.get(p.shopId)!.area.toLowerCase() === area.toLowerCase() &&
        (!category || p.category === category) &&
        (maxPrice === undefined || p.price <= maxPrice))
      .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
      .slice(0, limit)
      .map(({ p }) => withShop(p));
  },

  async getProduct(id) {
    const p = productsById.get(id);
    return p ? withShop(p) : null;
  },

  async createOrder(items, customer) {
    const byShop = new Map<string, StoredOrder>();
    for (const { productId, quantity } of items) {
      const p = productsById.get(productId);
      if (!p || !p.inStock) throw new Error(`Product ${productId} is not available`);
      let order = byShop.get(p.shopId);
      if (!order) {
        order = { id: `ord-${nextOrderId++}`, shopId: p.shopId, items: [], total: 0, status: "pending",
          userToken: customer.userToken, etaMinutes: withShop(p).etaMinutes };
        byShop.set(p.shopId, order);
      }
      order.items.push({ productId, name: p.name, quantity, price: p.price });
      order.total += p.price * quantity;
    }
    for (const order of byShop.values()) orders.set(order.id, order);
    return [...byShop.values()].map(({ userToken, confirmedAt, etaMinutes, ...order }) => order);
  },

  async confirmOrder(orderId, customer) {
    const order = ownOrder(orderId, customer);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status !== "pending") throw new Error(`Order ${orderId} is already ${order.status}`);
    order.status = "confirmed";
    order.confirmedAt = Date.now();
    const { userToken, confirmedAt, etaMinutes, ...rest } = order;
    return rest;
  },

  async getOrderStatus(orderId, customer) {
    return ownOrder(orderId, customer)?.status ?? null;
  },

  // The sample store has no payment provider: confirmed orders stay pending until marked paid.
  async getPaymentStatus(orderId, customer) {
    const order = ownOrder(orderId, customer);
    if (!order) return null;
    return order.status === "paid" ? "paid" : order.status === "failed" ? "failed" : "pending";
  },

  async getDeliveryEta(orderId, customer) {
    const order = ownOrder(orderId, customer);
    if (!order?.confirmedAt) return null;
    const elapsed = (Date.now() - order.confirmedAt) / 60_000;
    return Math.max(0, Math.round(order.etaMinutes - elapsed));
  },
};
