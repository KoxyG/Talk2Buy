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
        category: { type: "string", enum: ["food", "grocery", "essentials"] },
        max_price: { type: "number", description: "Highest price in naira" },
        max_eta_minutes: { type: "integer", description: "Latest acceptable delivery time, in minutes from now" },
      },
      required: ["query"],
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
