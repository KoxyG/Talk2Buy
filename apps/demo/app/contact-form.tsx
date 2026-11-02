"use client";

// The "Talk to the team" form. Posts to /api/contact, which emails the team.

import { useState, type FormEvent } from "react";

type Status = { tone: "idle" | "sending" | "sent" | "error"; text?: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ tone: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus({ tone: "sending" });
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      form.reset();
      setStatus({ tone: "sent", text: "Thanks! We'll get back to you by email." });
    } else {
      setStatus({ tone: "error", text: data?.error ?? "Couldn't send right now. Please try again." });
    }
  }

  return (
    <form className="contact" onSubmit={submit}>
      <label>Your name<input name="name" required maxLength={100} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
      <label>Business name<input name="business" required maxLength={150} autoComplete="organization" /></label>
      <label>Website<input name="website" type="url" placeholder="https://" maxLength={300} /></label>
      <label className="wide">
        What you sell, which cities, and a link to your API docs if you have one
        <textarea name="message" rows={5} maxLength={3000} />
      </label>
      {/* Hidden from people; bots fill it in. */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="trap" />
      <div className="wide send">
        <button className="button" type="submit" disabled={status.tone === "sending"}>
          {status.tone === "sending" ? "Sending…" : "Send"}
        </button>
        {status.text && <p className={`status ${status.tone}`} role="status">{status.text}</p>}
      </div>
    </form>
  );
}
