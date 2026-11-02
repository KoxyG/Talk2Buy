// The contract every host store (Choppaddi, the sample store, future stores) implements.
// Tools only ever talk to a StoreAdapter, never to a store's API directly.

export type Category = "food" | "grocery" | "essentials";
export type ShopType = "restaurant" | "grocery" | "essentials";
export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Shop = {
  id: string;
  name: string;
  type: ShopType;
  area: string;
  openingHours: Partial<Record<Day, [open: string, close: string]>>; // "08:00", "21:00"
  avgPrepMinutes: number;
};

export type Product = {
  id: string;
  shopId: string;
  name: string;
  category: Category;
  description: string;
  unit: string | null; // kg, litre, tin, sachet, pack, carton, crate, loaf, paint, derica, plate
  size: number | null; // 5 for 5kg
  price: number; // naira, from the store; never from the model
  inStock: boolean;
};

// What etaMinutes measures: "delivery" is until the order reaches the customer; "preparation" is
// until the shop has it ready, for stores that publish no delivery time.
export type EtaKind = "delivery" | "preparation";

export type ProductResult = Product & { shop: Shop; etaMinutes: number; etaKind: EtaKind };

// Hints the store may use to narrow its search. Tools re-apply every filter to the results,
// so a store that ignores some of these still returns correct answers.
export type ProductQuery = {
  query: string;
  area: string;
  category?: Category;
  maxPrice?: number;
  limit?: number;
};

export type OrderItem = { productId: string; name: string; quantity: number; price: number };
export type OrderStatus = "pending" | "confirmed" | "paid" | "failed";
export type PaymentStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  shopId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
};

// Identifies the customer to the store. Guests have no token and can't place orders.
export type Customer = { userToken: string };

// One shop's part of a cart, in the host's own IDs, for its own checkout (talk2buy:cart).
// vendorId is the shop's ID (Shop.id).
export type HandoffCart = {
  vendorId: string;
  vendorSlug?: string;
  items: { productId: string; quantity: number; variantId?: string }[];
};

export interface StoreAdapter {
  // Whether guests (no user token) may place orders. Real stores need the customer to log in.
  guestCheckout?: boolean;
  // false while ordering through this store isn't built yet: search and carts still work, and
  // create_order sends the customer to the store's own site. Missing means ordering works.
  ordersConnected?: boolean;
  // "handoff": the host page takes the cart to its own checkout. create_order re-checks the cart
  // and hands it to the page (one talk2buy:cart per shop) instead of placing orders.
  checkout?: "handoff";
  // For handoff: the cart's lines grouped per shop, in the host's own IDs.
  handoff?(items: { productId: string; shopId: string; quantity: number }[]): HandoffCart[];
  searchProducts(q: ProductQuery): Promise<ProductResult[]>;
  getProduct(id: string, area: string): Promise<ProductResult | null>;
  createOrder(items: { productId: string; quantity: number }[], customer: Customer): Promise<Order[]>; // one per shop
  confirmOrder(orderId: string, customer: Customer): Promise<Order>;
  getOrder(orderId: string, customer: Customer): Promise<Order | null>; // null if not this customer's
  getPaymentStatus(orderId: string, customer: Customer): Promise<PaymentStatus | null>;
  getDeliveryEta(orderId: string, customer: Customer): Promise<number | null>; // minutes from now
}
