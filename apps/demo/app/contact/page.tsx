import type { Metadata } from "next";
import { ContactForm } from "../contact-form";
import { ThemeToggle } from "../theme-toggle";

export const metadata: Metadata = {
  title: "Contact the team · Talk2Buy",
  description: "Add Talk2Buy to your store: tell us about your business and we'll get back to you.",
};

export default function ContactPage() {
  return (
    <>
      <header className="nav">
        <a href="/" className="brand">Talk<em>2</em>Buy</a>
        <nav>
          <a href="/#try">Try it</a>
          <a href="/#business">For businesses</a>
        </nav>
        <ThemeToggle />
      </header>

      <main className="contact-page">
        <h1>Talk to the <em>team</em></h1>
        <p className="lead">
          Want Talk2Buy on your store? Tell us about your business and we&apos;ll get back to you about connecting it.
        </p>
        <ContactForm />
      </main>

      <footer>Talk2Buy · Built for the Meta Global AI Developer Hackathon 2026</footer>
    </>
  );
}
