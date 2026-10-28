import { DemoWidget } from "./demo-widget";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Meta Global AI Developer Hackathon 2026</p>
      <h1>Order anything the way you&apos;d ask a friend.</h1>
      <p className="lead">
        Talk2Buy is a shopping assistant for local Nigerian shops that speaks English and Pidgin. Tell it what you need,
        your budget and how fast you need it. It finds real products, builds your cart and places your order. You press
        Confirm.
      </p>

      <h2>Try it</h2>
      <p>Pick your city in the chat, then tap an example or type your own.</p>
      <DemoWidget />

      <h2>How it works</h2>
      <ol className="steps">
        <li><strong>Ask in your own words.</strong> Slang, Pidgin and typos are fine: “jolof”, “mama put”, “1 derica beans”.</li>
        <li><strong>See real options.</strong> Every product, price and delivery time comes from the store, never from the AI.</li>
        <li><strong>Build a cart.</strong> Send a whole shopping list; it groups items by shop and tells you what&apos;s missing.</li>
        <li><strong>You confirm.</strong> The AI can&apos;t place or pay for anything. Only your Confirm button can.</li>
      </ol>

      <p className="notice">
        This demo uses a sample store with made-up shops in 7 cities. Payments are simulated: a confirmed order shows as
        paid after about 15 seconds, and no money moves.
      </p>
    </main>
  );
}
