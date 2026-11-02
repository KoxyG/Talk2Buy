// POST /api/contact: the landing page's "Talk to the team" form. Emails the request through
// Resend to CONTACT_TO_EMAIL, with the sender as reply-to so you can answer straight from your inbox.
// Needs RESEND_API_KEY and CONTACT_TO_EMAIL. Until a domain is verified in Resend, mail is sent from
// onboarding@resend.dev, which only delivers to the Resend account's own address.

const RESEND_URL = "https://api.resend.com/emails";
const FROM = process.env.CONTACT_FROM_EMAIL ?? "Talk2Buy <onboarding@resend.dev>";
const LIMITS = { name: 100, email: 200, business: 150, website: 300, message: 3000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = keyof typeof LIMITS;

export async function POST(req: Request) {
  // Only this site's own form, not other sites posting to it.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return Response.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) return Response.json({ error: "Contact form isn't set up" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  // Hidden field people never see: bots that fill it get a quiet success.
  if (body.company) return Response.json({ ok: true });

  const get = (field: Field) => (typeof body[field] === "string" ? body[field].trim() : "");
  const form = Object.fromEntries((Object.keys(LIMITS) as Field[]).map((f) => [f, get(f)])) as Record<Field, string>;
  if (!form.name || !form.business || !EMAIL.test(form.email)) {
    return Response.json({ error: "Please add your name, business and a valid email." }, { status: 400 });
  }
  if ((Object.keys(LIMITS) as Field[]).some((f) => form[f].length > LIMITS[f])) {
    return Response.json({ error: "One of the fields is too long." }, { status: 400 });
  }

  const text = [
    `Name: ${form.name}`,
    `Email: ${form.email}`,
    `Business: ${form.business}`,
    `Website: ${form.website || "-"}`,
    "",
    form.message || "(no message)",
  ].join("\n");

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: form.email, subject: `Talk2Buy integration: ${form.business}`, text }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("Contact form: Resend returned", res?.status ?? "no response");
    return Response.json({ error: "Couldn't send right now. Please try again." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
