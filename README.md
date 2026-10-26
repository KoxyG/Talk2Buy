# Talk2Buy

**Order anything the way you'd ask a friend.** Talk2Buy is an AI shopping assistant for local
Nigerian shops that speaks English and Pidgin. Tell it what you need, your budget and how fast you
need it. It finds real products from nearby shops, builds your cart, places your order and confirms
your payment.

> "Abeg find me jollof wey no pass 3k, make e reach me before 2pm."
>
> "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent."

Built for the **Meta Global AI Developer Hackathon 2026** (Indie Developer Track) by Koxy Builds.

> 🚧 Work in progress. The demo link, demo video and evaluation results will be added before submission.

## How it works

- **Agent API** (`services/agent`): a tool-calling loop on Meta models that turns a chat message
  into product searches, carts and orders.
- **Tools API** (`services/tools`): the only service that reads product, order and payment data.
- **Chat widget** (`packages/widget`): drop-in script tag or React component.
- **Demo page** (`apps/demo`): standalone Next.js page used as the submission link.
- **Evaluation** (`eval`): 50 test requests in English and Pidgin, scored per model.

## Models

| Role | Model | Runs on |
|---|---|---|
| Core agent | Muse Glimmer (Meta open weights) | Baseten |
| Comparison and fallback | Muse Spark 1.3 | Meta Model API |
| Product search embeddings | BGE-M3 | Baseten or Modal |
| Voice input (planned) | Muse Voice Transcribe | Meta Model API |

## Safety by design

- Prices and totals come only from the database. The eval checks every ₦ amount in a reply
  against that turn's tool results.
- The model cannot confirm an order. Only the customer's confirm button can.
- The agent can read payment status but cannot start or move payments.
- Phone numbers and addresses never reach the model.
- Unknown Pidgin or slang is looked up in a glossary, then the web, and the lookup returns a
  meaning only, never products or prices.

## Getting started

Requires Node 20+ and pnpm 9.

    pnpm install
    cp .env.example .env   # add your Baseten, Meta and Supabase keys
    pnpm ping              # check that both models respond

## Project plan

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).
