// Tool definitions sent to the model (OpenAI-compatible format). The descriptions are the first
// layer of typo correction: the model is told to spell queries correctly.

export const searchProductsDefinition = {
  type: "function",
  function: {
    name: "search_products",
    description:
      "Search real products from shops that deliver to the customer's city and are open now. " +
      "Always call this before recommending anything; never invent products or prices. " +
      "Write the query in plain English with correct spelling ('jollof rice', not 'jolof'), and " +
      "turn Pidgin into filters ('wey no pass 3k' means max_price 3000). Keep sizes and units in " +
      "the query ('5kg rice', 'indomie carton'). If the result has corrections or a note, tell the customer.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the customer wants, e.g. 'jollof rice' or '5kg rice'" },
        category: {
          type: "string",
          enum: ["food", "grocery", "essentials"],
          description: "Always set: 'food' for cooked, ready-to-eat meals and snacks; 'grocery' for raw ingredients and packaged staples (rice, beans, bread, garri, oil, milk) and household items",
        },
        max_price: { type: "number", description: "Highest price in naira" },
        max_eta_minutes: { type: "integer", description: "Latest acceptable delivery time, in minutes from now" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
} as const;

export const lookupTermDefinition = {
  type: "function",
  function: {
    name: "lookup_term",
    description:
      "Look up what a Pidgin, slang or local food word means, before searching. Returns a meaning " +
      "and a suggested search query, never products or prices. If confidence is 'none', ask the " +
      "customer one short question about the word.",
    parameters: {
      type: "object",
      properties: { term: { type: "string", description: "The unclear word or phrase, as the customer wrote it" } },
      required: ["term"],
      additionalProperties: false,
    },
  },
} as const;

export const getProductDefinition = {
  type: "function",
  function: {
    name: "get_product",
    description: "Get full, current details of one product by its id from search_products.",
    parameters: {
      type: "object",
      properties: { product_id: { type: "string" } },
      required: ["product_id"],
      additionalProperties: false,
    },
  },
} as const;

export const buildCartDefinition = {
  type: "function",
  function: {
    name: "build_cart",
    description:
      "Turn a shopping list of two or more different products into a cart, grouped by shop, with store prices and " +
      "a total. Replaces the customer's open cart, so use update_cart to change an existing cart. " +
      "Spell each query correctly in plain English and keep sizes and units in their own fields. " +
      "Tell the customer about every item in items_not_found and any item note.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              query: { type: "string", description: "The item, e.g. 'rice', 'tomato paste', 'indomie'" },
              quantity: { type: "integer", description: "How many, default 1" },
              size: { type: "string", description: "Weight or volume if given, e.g. '5kg', '1 litre'" },
              unit: { type: "string", description: "Pack type if given, e.g. 'tin', 'carton', 'crate', 'paint', 'derica', 'sachet'" },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
} as const;

export const updateCartDefinition = {
  type: "function",
  function: {
    name: "update_cart",
    description:
      "Change the customer's open cart: set an item's quantity, remove it (quantity 0) or add a new " +
      "item. Identify items by product_id from the cart or a search, or by query. Returns the whole " +
      "updated cart with a new total.",
    parameters: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              query: { type: "string", description: "Item to add or change, e.g. 'sugar'" },
              quantity: { type: "integer", description: "New quantity; 0 removes the item" },
            },
            required: ["quantity"],
            additionalProperties: false,
          },
        },
      },
      required: ["changes"],
      additionalProperties: false,
    },
  },
} as const;

export const createOrderDefinition = {
  type: "function",
  function: {
    name: "create_order",
    description:
      "Turn the customer's open cart into orders (one per shop), only after they have seen the " +
      "cart total and said they want to order. Orders stay pending until the customer presses " +
      "Confirm. If the result is cart_changed, explain the changes and ask again.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
} as const;
