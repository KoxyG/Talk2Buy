# Talk2Buy: Detailed Project Plan

Meta Global AI Developer Hackathon 2026 · Indie Developer Track · Team: Koxy Builds · Builder: Progress Ochuko Eyaadah (Koxy)

## Overview

- **Name:** Talk2Buy
- **One-liner:** Order anything the way you'd ask a friend: an AI assistant for local Nigerian shops that speaks English and Pidgin.
- **Description:** Talk2Buy is an AI assistant that lets you order food, groceries and daily essentials just by chatting, in English or Pidgin. Tell it what you need, your budget and how fast you need it, and it finds real products from nearby shops, builds your cart, places your order and confirms your payment.
- **Theme:** Build for Your World.
- **Deadline:** Nov 4, 9:00 PM ET (2:00 AM Nov 5, Lagos). Target: submit on the evening of Nov 4.

## Scope

The system is built to handle any product. The hackathon demo focuses on two categories with real vendor data: food and groceries. Daily essentials are added if time allows. This keeps the demo reliable while showing the design extends to anything sold on the network.

Example requests Talk2Buy should handle:

- "Abeg find me jollof wey no pass 3k, make e reach me before 2pm."
- "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent."
- "Wetin I fit buy for breakfast with ₦5,000?"
- "Did my payment for the groceries go through?"

## Goals and success criteria

- A customer can go from a free-text request in English or Pidgin to a confirmed test order in under 2 minutes.
- A shopping list of 4 or more items becomes one cart with a correct total, split across shops where needed.
- At least 40 of 50 test requests (80%) handled correctly by the chosen model.
- At least 2 real people complete an order (Choppaddi beta page, or a test order on the demo page).
- Zero cases of the assistant stating a price that did not come from the database.

## Product approach

Talk2Buy is built as a separate product with three reusable parts:

1. An agent API that any frontend can call.
2. An embeddable chat widget (one script tag or a React component).
3. A standalone demo page with neutral branding, used as the hackathon submission link.

During testing, the same widget is embedded on a hidden beta page on the Choppaddi website for real customers. After the hackathon, once tested and once the Official Rules have been checked, the widget moves onto the main Choppaddi website with no rebuild.

## AI models

| Role | Model | Where it runs |
|---|---|---|
| Core agent (default) | Muse Spark 1.3 (use the standard ID, not contributor) | Meta Model API |
| Comparison and fallback | Muse Wonder 1.0 | Meta Model API |
| Comparison (open weights) | Muse Spark Open (`meta-models/muse-spark-open-1026`) | Baseten |
| Product photo cleanup and placeholders | Muse Image 1.0 | Meta Model API |
| Voice input (stretch) | Muse Voice Transcribe | Meta Model API |
| Coding assistant | Muse Code | Local terminal |

Baseten was dropped on Oct 26 and re-added on Oct 27, when its hackathon credits arrived ($100,
up to 2M tokens per minute, Muse Spark Open only). Use it for eval runs to save Meta credits.
Muse Spark Open also accepts images and audio, which could power product-photo search and voice
input (stretch items).

Embeddings were dropped on Oct 26: the model rewrites Pidgin into a plain search query (using
`pidgin_glossary` for local names), and the host store's own search finds the products. No Modal
needed.

## Repository structure

- `apps/demo`: Next.js standalone demo page
- `packages/widget`: embeddable chat widget (script tag and React component)
- `services/agent`: agent API with the tool-calling loop
- `services/tools`: Tools API, the only service that touches product, order and payment data
- `eval`: test requests and the evaluation script
- `docs`: architecture diagram and README assets

## Key interfaces

### Agent API

`POST /chat` takes a project ID, the customer's message, their delivery area, and optionally a
session ID and user token. It streams back server-sent events: `session`, `text`, `products`,
`cart`, `orders`, `done` and `error`.

`POST /orders/:id/confirm` takes a project ID, session ID and optional user token. Only the
widget's Confirm button calls it, and it only confirms orders created in that session.

### Tools

| Tool | Inputs | Returns | Rule |
|---|---|---|---|
| `search_products` | query, category, max_price, max_eta_minutes | Up to 5 matching products with shop, price, size, ETA, plus any spelling corrections or size note | Real products and store prices only |
| `get_product` | product_id | Full product details | Read-only |
| `lookup_term` | term | Meaning and suggested search query | Never returns products or prices |
| `build_cart` | items (query, quantity, size, unit) | Cart grouped by shop, with store prices, subtotals, total and any items not found | Picks in-stock items; flags anything missing instead of guessing |
| `update_cart` | changes (product_id or query, quantity; 0 removes) | Updated cart | Totals recalculated from store prices |
| `create_order` | none | Pending orders (one per shop), or `cart_changed` if a price or stock changed | Never confirmed by the model |
| `confirm_order` | order_id | Confirmed order | Not a model tool: `POST /orders/:id/confirm`, called only by the widget's confirm button |
| `get_payment_status` | order_id | Paid, pending or failed | Read-only, cannot move money |
| `get_delivery_eta` | order_id | Estimated arrival | Read-only |

The area, session and user token come from the server, never from the model. Cart tools act on
the session's one open cart, so the model never handles a cart ID.

## Database schema

- **projects:** id, name, allowed_domains
- Products and shops are not stored. Tools read them live from the host store through its adapter.
- **carts:** id, project_id, session_id, items, total, items_not_found, order_ids. One open cart
  per session; once ordered, a cart is closed and the next change starts a new one.
- Orders are not stored. They live in the host store; `carts.order_ids` links them to the session.
- **conversations:** session_id, project_id, messages, created_at
- **pidgin_glossary:** term, meaning, normalized_query, source, verified
- **eval_runs:** model, request, expected, actual, correct, latency

## System prompt outline

- Role: a friendly local shopping assistant for shops across Nigeria; only shows shops that deliver to the customer's city.
- Language: understand English and Pidgin; reply in the language the customer uses.
- Always use `search_products` or `build_cart` before recommending anything; never invent products or prices.
- For shopping lists, use `build_cart` and clearly say which items were not found.
- Ask one short question if size, quantity, budget, area or timing is missing and matters.
- Show at most three options per item.
- Before ordering, summarise the cart and total and ask the customer to confirm.
- Explain payment and delivery status in plain, friendly language.

## Safety and privacy rules

- Prices and totals come only from the store, through its adapter.
- No order is placed without the customer pressing confirm.
- The agent can read payment status but cannot start or move payments.
- Phone numbers and addresses stay in the backend; tools look them up by session ID.
- Hackathon orders use a sandbox or testnet.
- Product data is a read-only copy, not the production database.

## Day-by-day plan

### Day 1, Mon Oct 26: Setup and test set

- Watch the kickoff, accept the Official Rules, read the submission requirements and any rules on projects tied to an existing company.
- Claim Meta Model API credits; confirm model IDs.
- Create the repo with the structure above.
- Write 50 test requests, half in Pidgin: 20 food, 20 groceries (including 8 shopping lists), 10 payment or delivery questions. Each has the expected tool and filters.
- **Done when:** a test message reaches both Muse Spark 1.3 and Muse Wonder and gets a reply.

### Day 2, Tue Oct 27: Data and search

- Create the Talk2Buy tables on Supabase (`001_init.sql`).
- Build the store adapter interface and a sample adapter with about 50 products.
- Seed `pidgin_glossary` with local names, such as swallow, small chops, garri, Indomie, Omo.
- Automatic typo correction, without asking the customer: the model spells the query correctly,
  each word is fuzzy-matched against `pidgin_glossary`, and a search with no results is retried
  once with the closest glossary match.
- Build `search_products` and `get_product` on the adapter. Filters the host's search can't
  apply (budget, in stock, open now, area, size) are applied to its results.
- Build the Choppaddi adapter once its API details arrive.
- **Done when:** "rice under ₦3,000" and "5kg rice" both return only matching real products.

### Day 3, Wed Oct 28: Agent loop

- Write the system prompt from the outline above.
- Build the tool-calling loop (maximum 5 steps) behind `POST /chat`, with streaming.
- Log every model call with model, latency and tool calls.
- **Done when:** single-item requests in English and Pidgin return correct products.

### Day 4, Thu Oct 29: Carts and ordering

- Build `build_cart` and `update_cart`, including grouping items by shop and flagging items not found.
- Build `create_order` (one order per shop) and `confirm_order`.
- Connect orders to the sandbox or testnet.
- **Done when:** a 4-item shopping list becomes a correct cart and a confirmed test order.

### Day 5, Fri Oct 30: Widget and payments

- Build the chat widget: product cards, cart view, confirm button, streaming text, mobile-first layout.
- Package it as a script tag and as a React component.
- Host it on the standalone Talk2Buy demo page.
- Add `get_payment_status` and `get_delivery_eta` with plain-language explanations.
- **Done when:** the full flow works in the widget on a phone.

### Day 6, Sat Oct 31: Evaluate and tune

- Run all 50 test requests through Muse Spark 1.3, Muse Wonder and Muse Spark Open.
- Score correct tool, correct filters, correct cart contents and response time.
- Improve the prompt and tool descriptions for failures, then re-run.
- Choose the default model.
- **Done when:** there is an accuracy table and a chosen model.

### Day 7, Sun Nov 1: Real users

- If Choppaddi is onboarded: embed the widget on a hidden beta page on the Choppaddi website and
  invite 3 to 5 real customers. If not: invite 3 to 5 people anywhere in Nigeria to use the
  demo page (sample store) and pick their own city.
- Each tester places a food order and a grocery order in their own words.
- Log every failure and collect short feedback.
- **Done when:** at least 2 people complete an order and the failures are listed.

### Day 8, Mon Nov 2: Fix and stretch

- Fix the top failures from Day 7 and re-run the evaluation.
- If time allows, add one stretch item: daily essentials data, voice input (Muse Voice Transcribe), or product-photo search (only if a Meta model that reads images is available).
- **Done when:** the evaluation score is equal to or better than Day 6.

### Day 9, Tue Nov 3: Ship and record

- Deploy the final version.
- Write the README: problem, architecture diagram, models used and why, evaluation results, how to run it.
- Record a 2 to 3 minute demo video: the problem, a Pidgin food order, a grocery shopping list, the safety rules, results and user feedback.
- **Done when:** the demo link, repo and video are public and working.

### Day 10, Wed Nov 4: Buffer and submit

- Test every link from a fresh browser and a phone.
- Submit by evening Lagos time.

## Risks and fallbacks

| Risk | Fallback |
|---|---|
| Meta Model API credits run low (reasoning tokens are most of each reply) | Set a $150 spend limit, cap `max_tokens`, and run the full eval only twice |
| Host store's search is weak (no typo or partial matching) | Automatic typo correction (model, glossary fuzzy match, one retry); if still weak, add a Talk2Buy search index synced from the host |
| Weak Pidgin understanding | Add Pidgin examples to the prompt and local names to product descriptions |
| Messy grocery data (inconsistent units and sizes) | Normalise units inside the adapter for the most common 100 grocery products first |
| Shopping lists split across many shops | Prefer the fewest shops that cover the list; show which items come from where |
| Not enough real testers | Recruit friends and family in any Nigerian city to use the demo page; run tests over a call |
| Choppaddi not onboarded in time | Build and demo on the sample store; the Choppaddi adapter plugs in later with no other changes |
| Backend integration takes too long | Use a mock orders service with the same interface for the demo |
| Running behind schedule | Drop stretch items first, then essentials; never drop the evaluation or the demo video |

## Submission checklist

- [ ] Working demo link
- [ ] Public GitHub repo with README and architecture diagram
- [ ] Demo video showing a Pidgin food order and a grocery shopping list from request to confirmation
- [ ] Evaluation results table
- [ ] Note on which Meta models were used and why
- [ ] Real user test summary

## Amendments (Oct 26)

- **`lookup_term` tool (Pidgin/slang fallback):** if a term is unclear, or `search_products`
  finds nothing for an unknown word, check `pidgin_glossary` first, then search the web
  (Brave Search) for `"<term>" Nigerian Pidgin meaning`. Return only
  `{ meaning, normalized_query, source, confidence }`, never products or prices.
  Web results are saved to the glossary as unverified. Limits: 3s timeout, one web lookup per turn.
  If it's still unclear, ask the customer one short question.
- **New table `pidgin_glossary`:** id, term, meaning, normalized_query, source (glossary, web),
  verified, created_at.
- **`confirm_order` is not a model tool:** it becomes `POST /orders/:id/confirm`, called only by
  the widget's confirm button.
- **The server sets `session_id`:** tools take the session from the request, and any `cart_id` or
  `order_id` must belong to that session.
- **Eval checks for invented prices:** every ₦ amount in a reply must appear in that turn's
  tool results.
- **Mock orders service first:** build it behind the orders interface on Day 4, and swap in the
  sandbox when it's ready.
- **Day 3:** build `lookup_term` and seed the glossary. **Eval:** include about 5 slang-heavy requests.
- **Voice input with Muse Voice Transcribe:** first-priority stretch item. Day 5: placeholder mic
  button in the widget. Day 8: transcribe speech into the input box for the customer to check
  before sending, auto-send when they stop talking, keep only the main speaker. Transcripts go
  through the same agent and rules as typed messages.
- **Muse Image 1.0 for product visuals:** Day 2: clean up weak vendor photos (image-to-image,
  product must stay unchanged) and generate labelled "Illustration" placeholders for products with
  no photo. Day 9: demo page and video assets. Never generate fake photos of branded products, and
  never put prices in generated images. Product-photo *search* needs a model that reads images;
  check at kickoff whether Muse Spark 1.3 does, otherwise drop that stretch item.

## Amendments (Oct 26, integration)

- **Data source: Choppaddi testnet API, once Choppaddi is onboarded** (sample store until then).
  Choppaddi stays the source of truth for products,
  shops, prices, stock, orders and payments, read live. Supabase holds only Talk2Buy's own data:
  projects, carts, conversations, `pidgin_glossary` and `eval_runs`.
- **Store adapter:** tools never call a store's API directly. Each host project gets one adapter
  with `searchProducts`, `getProduct`, `createOrder`, `getOrderStatus`, `getPaymentStatus` and
  `getDeliveryEta`. Choppaddi is the first (`adapters/choppaddi.ts`); a new store needs only a new
  adapter.
- **Live prices:** `build_cart` and `create_order` re-check the latest price and stock with
  `getProduct` first.
- **Project registration:** each host project has a project ID, allowed domains and a server key
  for its API (in `.env`). The agent API rejects requests from domains that aren't allowed.
- **Widget settings:** project ID, language, theme colour and a `getUserToken` callback, set with
  script-tag attributes or React props. Styles are isolated from the host page.
- **Logged-in customers:** the host's backend issues a short-lived user token, the widget sends
  it with each message, and the agent verifies it with the host. Orders go to that customer's
  account. Guests can browse and build a cart, and log in at checkout.
- **Checkout stays with the host:** the confirm button creates the order through the adapter, and
  payment runs on the host's system. Talk2Buy only reads payment status.
- **Still needed from Choppaddi:** testnet API base URL, auth method, and endpoints for product
  search (by text, with price and area filters if available), product details, shops, orders and
  payment status, plus a user-token endpoint for Step 4.
- **Day 2 fallback:** if the API details aren't ready, start with about 50 hand-written sample
  products behind the same adapter interface, and swap to Choppaddi when ready.

## Amendments (Oct 28, Day 4)

- **No cart_id in tools:** `update_cart` and `create_order` act on the session's open cart. The
  model has no ID to get wrong and can't reach another session's cart.
- **Ordering is two steps:** `create_order` creates pending orders in the host store after the
  customer says yes in chat, and the Confirm button confirms them. This replaces "the confirm
  button creates the order" in the Oct 26 amendments.
- **Price re-check:** `create_order` re-checks every price and stock level first. If anything
  changed, it updates the cart and returns `cart_changed` instead of ordering.
- **Fewer split orders:** when a shop already in the cart sells an equivalent product (same
  category, unit and size), the cart uses that shop instead of splitting the order.
- **Guest checkout:** a store adapter sets `guestCheckout`. The sample store allows guests
  because the demo has no login; real stores need a logged-in customer.
- **User token:** `/chat` and the confirm endpoint accept a `user_token` and pass it to the
  adapter. Checking it with the host belongs in the Choppaddi adapter.
- **Searches retry:** a search that finds nothing tries looser spelling, then without pack words
  ("spaghetti pack"), then across all categories, and says so in a note.
