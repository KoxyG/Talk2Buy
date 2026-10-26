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
- At least 5 real customers complete an order through the beta page.
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
| Core agent (default) | Muse Glimmer (Meta open weights) | Baseten |
| Comparison and fallback | Muse Spark 1.3 (use the standard ID, not contributor) | Meta Model API |
| Product photo cleanup and placeholders | Muse Image 1.0 | Meta Model API |
| Product search embeddings | BGE-M3 (open-source, not Meta) | Baseten or Modal |
| Voice input (stretch) | Muse Voice Transcribe | Meta Model API |
| Coding assistant | Muse Code | Local terminal |

Confirm at kickoff that Baseten serves Muse Glimmer for the hackathon. If not, use the Meta open-weights model it does serve.

## Repository structure

- `apps/demo`: Next.js standalone demo page
- `packages/widget`: embeddable chat widget (script tag and React component)
- `services/agent`: agent API with the tool-calling loop
- `services/tools`: Tools API, the only service that touches product, order and payment data
- `eval`: test requests and the evaluation script
- `docs`: architecture diagram and README assets

## Key interfaces

### Agent API

`POST /chat` takes a session ID, the customer's message and their delivery area, and streams back the assistant's reply plus any product cards or cart summaries to display.

### Tools

| Tool | Inputs | Returns | Rule |
|---|---|---|---|
| `search_products` | query, category, max_price, max_eta_minutes, area | Matching products with shop, price, size, stock, ETA | Real products and database prices only |
| `get_product` | product_id | Full product details | Read-only |
| `build_cart` | session_id, list of requested items with quantities | Cart grouped by shop, with database totals and any items not found | Picks in-stock items; flags anything missing instead of guessing |
| `update_cart` | cart_id, changes | Updated cart | Totals recalculated from the database |
| `create_order` | cart_id | Pending order or orders (one per shop) | Never confirmed by the model |
| `confirm_order` | order_id | Confirmed order | Called only by the widget's confirm button |
| `get_payment_status` | order_id | Paid, pending or failed | Read-only, cannot move money |
| `get_delivery_eta` | order_id | Estimated arrival | Read-only |

## Database schema

- **shops:** id, name, type (restaurant, grocery, essentials), area, opening hours, average prep time
- **products:** id, shop_id, name, category, description, local names, unit, size, price, in_stock, embedding
- **carts:** id, session_id, items, total, items_not_found
- **orders:** id, cart_id, shop_id, items, total, status (pending, confirmed, paid, failed)
- **conversations:** session_id, messages, created_at
- **eval_runs:** model, request, expected, actual, correct, latency

## System prompt outline

- Role: a friendly local shopping assistant for shops in Asaba and Enugu.
- Language: understand English and Pidgin; reply in the language the customer uses.
- Always use `search_products` or `build_cart` before recommending anything; never invent products or prices.
- For shopping lists, use `build_cart` and clearly say which items were not found.
- Ask one short question if size, quantity, budget, area or timing is missing and matters.
- Show at most three options per item.
- Before ordering, summarise the cart and total and ask the customer to confirm.
- Explain payment and delivery status in plain, friendly language.

## Safety and privacy rules

- Prices and totals come only from the database.
- No order is placed without the customer pressing confirm.
- The agent can read payment status but cannot start or move payments.
- Phone numbers and addresses stay in the backend; tools look them up by session ID.
- Hackathon orders use a sandbox or testnet.
- Product data is a read-only copy, not the production database.

## Day-by-day plan

### Day 1, Mon Oct 26: Setup and test set

- Watch the kickoff, accept the Official Rules, read the submission requirements and any rules on projects tied to an existing company.
- Claim Baseten, Modal and Fireworks credits; confirm model IDs.
- Create the repo with the structure above.
- Write 50 test requests, half in Pidgin: 20 food, 20 groceries (including 8 shopping lists), 10 payment or delivery questions. Each has the expected tool and filters.
- **Done when:** a test message reaches both Muse Glimmer and Muse Spark 1.3 and gets a reply.

### Day 2, Tue Oct 27: Data and search

- Set up Postgres with pgvector on Supabase or Neon.
- Load a read-only snapshot of real food and grocery products.
- Normalise units and sizes (5kg, 1 carton, 1 tin) so quantities can be matched.
- Add local names to descriptions, such as swallow, small chops, garri, Indomie, Omo.
- Generate BGE-M3 embeddings for every product.
- Build `search_products` and `get_product` with hard filters for category, budget, in stock, open now and area.
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

- Run all 50 test requests through Muse Glimmer and Muse Spark 1.3.
- Score correct tool, correct filters, correct cart contents and response time.
- Improve the prompt and tool descriptions for failures, then re-run.
- Choose the default model.
- **Done when:** there is an accuracy table and a chosen model.

### Day 7, Sun Nov 1: Real users

- Embed the widget on a hidden beta page on the Choppaddi website.
- Invite 5 to 10 real customers to place a food order and a grocery order in their own words.
- Log every failure and collect short feedback.
- **Done when:** at least 5 people complete an order and the failures are listed.

### Day 8, Mon Nov 2: Fix and stretch

- Fix the top failures from Day 7 and re-run the evaluation.
- If time allows, add one stretch item: daily essentials data, voice input, or product-photo search with Muse Image.
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
| Muse Glimmer not available on Baseten | Use the Meta open-weights model Baseten serves, or Muse Spark 1.3 as the default |
| Weak Pidgin understanding | Add Pidgin examples to the prompt and local names to product descriptions |
| Messy grocery data (inconsistent units and sizes) | Clean a smaller set of the most common 100 grocery products first |
| Shopping lists split across many shops | Prefer the fewest shops that cover the list; show which items come from where |
| Not enough real testers | Recruit friends and family in Asaba and Enugu; run tests over a call |
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
