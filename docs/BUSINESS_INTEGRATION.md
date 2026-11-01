# Adding Talk2Buy to your site

Talk2Buy is a shopping assistant your customers chat with, by typing or speaking, in English or
Nigerian Pidgin. It finds products in your store, builds a cart, and hands the order back to your
customer to confirm. This guide covers what we need from you, the code you add, and how to test it.

## How it works

- Talk2Buy reads your store through the API you already have. You don't change your API, your data
  or your checkout.
- Products, prices, stock and opening hours always come from your API. The assistant never makes up
  a product or a price.
- Orders are only placed when the customer presses **Confirm**. The assistant can't take payments,
  issue refunds or confirm anything on its own.
- The chat runs on our hosted page, which your site opens in a dialog or side panel, the same way
  hosted KYC or checkout pages are embedded.

## What we need from you

| What | Why | When |
|---|---|---|
| Your API base URL (testnet and production) | So we can read products, shops and opening hours | To start |
| The domains your site runs on (e.g. `www.yourstore.com`, your testnet domain) | Only these domains are allowed to open the chat | To start |
| API credentials for creating orders | So the assistant can create orders for the customer to confirm | To turn on ordering |
| How your site identifies a logged-in customer (the token it holds and how your API accepts it) | So orders are placed as that customer | To turn on ordering |
| Your brand colour and the cities you serve | To match your look and show the right cities | Optional |

We set up your store as a project on our side. You get a project ID (for example `yourstore`).

## Step 1: Add the button and dialog

Paste this into your site layout, inside `<body>`. Replace `YOUR_PROJECT` with your project ID.

    <button id="order-ai">Order with AI</button>

    <dialog id="talk2buy" style="padding:0;border:0;border-radius:20px;
            width:min(420px,100vw);height:min(680px,100dvh)">
      <iframe src="https://talk2buy.vercel.app/embed?project=YOUR_PROJECT&voice&feedback"
              allow="microphone" style="width:100%;height:100%;border:0"></iframe>
    </dialog>

    <script>
      const dialog = document.getElementById("talk2buy");
      document.getElementById("order-ai").onclick = () => dialog.showModal();
      window.addEventListener("message", (e) => {
        if (e.origin !== "https://talk2buy.vercel.app") return; // only Talk2Buy
        if (e.data.type === "talk2buy:close") dialog.close();
      });
    </script>

### React or Next.js

    export function OrderWithAI() {
      const ref = useRef<HTMLDialogElement>(null);
      useEffect(() => {
        const onMessage = (e: MessageEvent) => {
          if (e.origin === "https://talk2buy.vercel.app" && e.data?.type === "talk2buy:close") ref.current?.close();
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      }, []);
      return (
        <>
          <button onClick={() => ref.current?.showModal()}>Order with AI</button>
          <dialog ref={ref} style={{ padding: 0, border: 0, borderRadius: 20, width: "min(420px,100vw)", height: "min(680px,100dvh)" }}>
            <iframe src="https://talk2buy.vercel.app/embed?project=YOUR_PROJECT&voice&feedback"
                    allow="microphone" style={{ width: "100%", height: "100%", border: 0 }} />
          </dialog>
        </>
      );
    }

Keep `allow="microphone"`: without it, browsers block voice input inside the frame.

## Step 2: Choose your settings

Settings go in the chat URL, after `?project=YOUR_PROJECT`, joined with `&`.

| Setting | Example | What it does |
|---|---|---|
| `project` | `project=yourstore` | Required. Your project ID. |
| `areas` | `areas=Asaba,Ibadan` | Cities in the city picker, comma-separated. |
| `area` | `area=Asaba` | One fixed city, with no picker. |
| `color` | `color=%23e2480f` | Accent colour as a hex value; write `#` as `%23`. |
| `language` | `language=pcm` | Start in Pidgin. Replies still follow the language the customer writes in. |
| `theme` | `theme=dark` | Dark mode. |
| `voice` | `voice` | Show the microphone button. |
| `feedback` | `feedback` | Show thumbs up/down under replies. |

## Step 3: Listen for events (optional)

The chat tells your page what happens through `postMessage`. Always check that `e.origin` is
`https://talk2buy.vercel.app` before acting on a message.

| Message `type` | When | Extra fields |
|---|---|---|
| `talk2buy:ready` | The chat has loaded | none |
| `talk2buy:close` | The customer pressed the close button | none |
| `talk2buy:orders` | Orders were created and wait for the customer's Confirm | `orders`, `total` |
| `talk2buy:confirmed` | The customer confirmed their orders | `orderIds` |

For example, after `talk2buy:confirmed` you might close the dialog and open your order page.

## Step 4: Test on your testnet

1. Open your testnet site and click **Order with AI**.
2. Pick a city and ask for something you sell, e.g. "I need water". Your products should appear
   with your prices.
3. Try the microphone. The browser should ask for permission.
4. Add an item and ask to order:
   - Before ordering is connected, the assistant says ordering in chat isn't available yet and
     points to your site.
   - After it's connected, the customer sees their orders and a **Confirm** button.
5. Press the close button. The dialog should close.

If the frame is blank or refuses to load, your domain isn't on the project's allowed list yet.
Send us the exact domain.

## Going live

- Send us your production domain and production API URL.
- Change nothing in the snippet except, if we give you one, the project ID for production.
- Test steps 1 to 5 again on production.

## Security

- Only the domains you give us can open the chat. Other sites are blocked by the browser.
- Messages from the chat go only to the page that opened it.
- Prices and stock are always re-checked with your API before an order is created.

## Good to know

- Shops that are closed don't appear in results, so late at night the assistant may find nothing.
- Delivery or preparation time is shown as your store reports it. If your store only gives
  preparation time, the assistant says "ready in" rather than promising arrival.
- Ordering on your store is turned on once we have your API credentials and know how your
  customer login works (see "What we need from you").
