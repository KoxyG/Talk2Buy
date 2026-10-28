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

export type ProductResult = Product & { shop: Shop; etaMinutes: number };

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

export interface StoreAdapter {
  // Whether guests (no user token) may place orders. Real stores need the customer to log in.
  guestCheckout?: boolean;
  searchProducts(q: ProductQuery): Promise<ProductResult[]>;
  getProduct(id: string, area: string): Promise<ProductResult | null>;
  createOrder(items: { productId: string; quantity: number }[], customer: Customer): Promise<Order[]>; // one per shop
  confirmOrder(orderId: string, customer: Customer): Promise<Order>;
  getOrderStatus(orderId: string, customer: Customer): Promise<OrderStatus | null>;
  getPaymentStatus(orderId: string, customer: Customer): Promise<PaymentStatus | null>;
  getDeliveryEta(orderId: string, customer: Customer): Promise<number | null>; // minutes from now
}
