import { DemoWidget } from "./demo-widget";
import { ThemeToggle } from "./theme-toggle";

const STEPS = [
  { title: "Ask in your own words", body: "Type or tap the mic and speak. Slang, Pidgin and typos are fine: “jolof”, “mama put”, “1 derica beans”." },
  { title: "See real options", body: "Every product, price and delivery or preparation time comes from the store, never from the AI." },
  { title: "Build a cart", body: "Send a whole shopping list; it groups items by shop and tells you what’s missing." },
  { title: "You confirm", body: "The AI can’t place or pay for anything. Only your Confirm button can." },
];

const EMBED_SNIPPET = `<button id="order-ai">Order with AI</button>
<dialog id="talk2buy" style="padding:0;border:0;border-radius:20px;
        width:min(420px,100vw);height:min(680px,100dvh)">
  <iframe src="https://talk2buy.vercel.app/embed?project=your-shop&voice&feedback"
          allow="microphone" style="width:100%;height:100%;border:0"></iframe>
</dialog>
<script>
  const dialog = document.getElementById("talk2buy");
  document.getElementById("order-ai").onclick = () => dialog.showModal();
  addEventListener("message", (e) => {
    if (e.origin === "https://talk2buy.vercel.app" && e.data.type === "talk2buy:close") dialog.close();
  });
</script>`;

const GUIDE_URL = "https://github.com/KoxyG/Talk2Buy/blob/main/docs/BUSINESS_INTEGRATION.md";
export default function Home() {
  return (
    <>
      <header className="nav">
        <a href="#" className="brand">Talk<em>2</em>Buy</a>
        <nav>
          <a href="#try">Try it</a>
          <a href="#how">How it works</a>
          <a href="#business">For businesses</a>
          <a href="/contact">Contact</a>
        </nav>
        <ThemeToggle />
        <a href="#try" className="button small">Start chatting</a>
      </header>

      <section className="hero">
        <p className="badge">Meta Global AI Developer Hackathon 2026</p>
        <h1>Order anything the way you&apos;d <em>ask a friend</em>.</h1>
        <p className="lead">
          Talk2Buy is a shopping assistant for local shops that speaks English and Nigerian Pidgin. Type or say what you
          need, your budget and how fast you need it. It finds real products, builds your cart and places your order. You
          press Confirm.
        </p>
        <div className="actions">
          <a href="#try" className="button">Try it</a>
          <a href="#how" className="button ghost">How it works</a>
        </div>
      </section>

      <dl className="stats">
        <div><dt>Cities</dt><dd>7</dd></div>
        <div><dt>Languages</dt><dd>English + Pidgin, typed or spoken</dd></div>
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
            Add Talk2Buy to your website with one button and a dialog. It reads your store through the API you already
            have; you don&apos;t change your API, data or checkout. Prices, stock and times always come from your store.
          </p>
          <div className="embeds">
            <figure>
              <figcaption>Any website</figcaption>
              <pre><code>{EMBED_SNIPPET}</code></pre>
            </figure>
          </div>
          <p className="note">
            Set your brand colour, light or dark theme, starting language, and your cities in the URL. Only your domains
            can open the chat. <a href={GUIDE_URL}>Read the integration guide</a>.
          </p>
        </section>

        <aside className="notice">
          <h2>It&apos;s a <em>demo</em></h2>
          <p>
            This demo uses a sample store with made-up shops in 7 Nigerian cities. The shops keep real opening hours
            (most open 7–10am and close 7–10pm Nigerian time), so late at night you may find little or nothing. Payments
            are simulated: a confirmed order shows as paid after about 15 seconds, and no money moves.
          </p>
          <a href="#try" className="button">Back to the examples</a>
        </aside>

        <section id="contact">
          <h2>Want it on your <em>product or app</em>?</h2>
          <p className="lead">Tell us about your business and we&apos;ll help you connect it.</p>
          <a href="/contact" className="arrow-link">
            Talk to the team <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer>Talk2Buy · Built for the Meta Global AI Developer Hackathon 2026</footer>
    </>
  );
}
