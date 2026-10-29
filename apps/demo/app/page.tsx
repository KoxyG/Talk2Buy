import { DemoWidget } from "./demo-widget";
import { ThemeToggle } from "./theme-toggle";

const STEPS = [
  { title: "Ask in your own words", body: "Slang, Pidgin and typos are fine: “jolof”, “mama put”, “1 derica beans”." },
  { title: "See real options", body: "Every product, price and delivery time comes from the store, never from the AI." },
  { title: "Build a cart", body: "Send a whole shopping list; it groups items by shop and tells you what’s missing." },
  { title: "You confirm", body: "The AI can’t place or pay for anything. Only your Confirm button can." },
];

const SCRIPT_SNIPPET = `<script src="https://…/talk2buy.js"
  data-project-id="your-shop"
  data-api-url="https://…"
  data-theme-color="#e2480f"
  data-theme="dark"
  data-language="pcm"
  data-areas="Lagos,Abuja" defer></script>`;

const REACT_SNIPPET = `import { Talk2BuyWidget } from "@talk2buy/widget/react";

<Talk2BuyWidget
  projectId="your-shop"
  apiUrl="https://…"
  themeColor="#e2480f"
  areas={["Lagos", "Abuja"]}
/>`;

export default function Home() {
  return (
    <>
      <header className="nav">
        <a href="#" className="brand">Talk<em>2</em>Buy</a>
        <nav>
          <a href="#try">Try it</a>
          <a href="#how">How it works</a>
          <a href="#business">For businesses</a>
        </nav>
        <ThemeToggle />
        <a href="#try" className="button small">Start chatting</a>
      </header>

      <section className="hero">
        <p className="badge">Meta Global AI Developer Hackathon 2026</p>
        <h1>Order anything the way you&apos;d <em>ask a friend</em>.</h1>
        <p className="lead">
          Talk2Buy is a shopping assistant for local Nigerian shops that speaks English and Pidgin. Tell it what you need,
          your budget and how fast you need it. It finds real products, builds your cart and places your order. You press
          Confirm.
        </p>
        <div className="actions">
          <a href="#try" className="button">Try it</a>
          <a href="#how" className="button ghost">How it works</a>
        </div>
      </section>

      <dl className="stats">
        <div><dt>Cities</dt><dd>7</dd></div>
        <div><dt>Languages</dt><dd>English + Pidgin</dd></div>
        <div><dt>Orders without your Confirm</dt><dd>0</dd></div>
      </dl>

      <main>
        <section id="try">
          <h2>Try <em>it</em></h2>
          <p className="lead">Pick your city in the chat, then tap an example or type your own.</p>
          <DemoWidget />
        </section>

        <section id="how">
          <h2>How it <em>works</em></h2>
          <ol className="steps">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="business">
          <h2>For <em>businesses</em></h2>
          <p className="lead">
            Add Talk2Buy to your own website with one script tag, or as a React component. Your customers chat in
            English or Pidgin; prices, stock and delivery times still come from your store, never from the AI.
          </p>
          <div className="embeds">
            <figure>
              <figcaption>Any website</figcaption>
              <pre><code>{SCRIPT_SNIPPET}</code></pre>
            </figure>
            <figure>
              <figcaption>React</figcaption>
              <pre><code>{REACT_SNIPPET}</code></pre>
            </figure>
          </div>
          <p className="note">
            Set your brand colour, light or dark theme, the default language, and a fixed delivery city or a list to
            choose from. The widget runs in its own shadow root, so it won&apos;t clash with your site&apos;s styles.
          </p>
        </section>

        <aside className="notice">
          <h2>It&apos;s a <em>demo</em></h2>
          <p>
            This demo uses a sample store with made-up shops in 7 cities. Payments are simulated: a confirmed order shows
            as paid after about 15 seconds, and no money moves.
          </p>
          <a href="#try" className="button">Back to the examples</a>
        </aside>
      </main>

      <footer>Talk2Buy · Built for the Meta Global AI Developer Hackathon 2026</footer>
    </>
  );
}
