# Talk2Buy

**Order anything the way you'd ask a friend.** Talk2Buy is an AI shopping assistant for local
Nigerian shops that speaks English and Pidgin. Tell it what you need, your budget and how fast you
need it. It finds real products from nearby shops, builds your cart, places your order and confirms
your payment.

> "Abeg find me jollof wey no pass 3k, make e reach me before 2pm."
>
> "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent."

Built for the **Meta Global AI Developer Hackathon 2026** (Indie Developer Track) by Koxy Builds.

**Live demo:** [talk2buy.vercel.app](https://talk2buy.vercel.app)

> 🚧 The demo video will be added before submission.

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
| Core agent | Muse Spark 1.3 | Meta Model API |
| Comparison and fallback | Muse Wonder 1.0 | Meta Model API |
| Comparison (open weights) | Muse Spark Open | Baseten |
| Voice input (planned) | Muse Voice Transcribe | Meta Model API |

The live demo currently runs on **Muse Spark Open** (`AGENT_MODEL=spark-open`). The Meta Model API
returns `model_not_found` for requests from our host (Render), although the same key works from a
home connection; we have reported this to Meta. All three models score 100% on the eval and use the
same OpenAI-compatible API, so switching back is one environment variable.

## Safety by design

- Prices and totals come only from the store. The eval checks every ₦ amount in a reply
  against that turn's tool results.
- The model cannot confirm an order. Only the customer's confirm button can.
- The agent can read payment status but cannot start or move payments.
- Phone numbers and addresses never reach the model.
- Unknown Pidgin or slang is looked up in a glossary, then the web, and the lookup returns a
  meaning only, never products or prices.

## Evaluation

50 requests (half in Pidgin: food, groceries, shopping lists, payment and delivery questions),
scored on tool choice, filters, cart contents, safety behaviour and invented prices.

| Model | Correct | Median reply |
|---|---|---|
| Muse Spark 1.3 (default) | 100% | 4.8s |
| Muse Wonder | 100% | 8.0s |
| Muse Spark Open | 100% | 4.7s |

Run it with `pnpm eval` (options: `--models spark,wonder`, `--only F01,G13`).

## Getting started

Requires Node 20+ and pnpm 9.

    pnpm install
    cp .env.example .env   # add your Meta, Baseten and Supabase keys
    pnpm ping              # check that both models respond

Run the agent and its checks:

    pnpm --filter @talk2buy/agent dev          # chat API on http://localhost:8787
    pnpm --filter @talk2buy/tools try-search   # search tools against the sample store
    pnpm --filter @talk2buy/tools try-cart     # carts, orders and confirm
    pnpm --filter @talk2buy/agent try-agent    # eval requests through the agent
    pnpm --filter @talk2buy/agent try-order    # a full chat order, list to confirmed
    pnpm --filter @talk2buy/demo dev           # demo page on http://localhost:3000 (agent must be running)

Add the widget to any site with a script tag (build it with `pnpm --filter @talk2buy/widget build`):

    <script src="talk2buy.js" data-project-id="sample" data-api-url="http://localhost:8787"
            data-areas="Lagos,Abuja" data-theme="dark" defer></script>

Or in React:

    import { Talk2BuyWidget } from "@talk2buy/widget/react";
    <Talk2BuyWidget projectId="sample" apiUrl="http://localhost:8787" areas={["Lagos", "Abuja"]} />

Options: `themeColor` (`data-theme-color`), `theme` (`data-theme`: `light` or `dark`, default light),
`language` (`data-language`: `en` or `pcm`), and a fixed `area` or a list of `areas` to choose from.
The widget runs in a shadow root, so it doesn't clash with the host site's styles.

## Deployment

**Agent API (Render, Node):**

- Root directory: repo root (the agent uses the `@talk2buy/tools` workspace package)
- Build: `corepack pnpm install --frozen-lockfile`
- Start: `corepack pnpm --filter @talk2buy/agent exec tsx src/server.ts`
- Environment: the keys from `.env.example`, plus `AGENT_PORT=10000`, `NODE_VERSION=22`,
  `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` and, for now, `AGENT_MODEL=spark-open`
- Region: Frankfurt, close to the Supabase database (London)

**Demo page (Vercel):**

- Root directory: `apps/demo`
- Environment: `NEXT_PUBLIC_AGENT_URL` set to the agent's URL (public; it is only an address)

**Allowed sites:** the agent only accepts browser requests from domains in the project's
`allowed_domains`. Add each site that embeds the widget:

    update projects set allowed_domains = array_append(allowed_domains, 'your-site.com') where id = 'sample';

## Project plan

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).
