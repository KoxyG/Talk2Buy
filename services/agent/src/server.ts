// POST /chat: takes a customer message and streams back the reply, product cards, cart and
// orders as server-sent events (session, text, products, cart, orders, done, error).
// POST /orders/:id/confirm: the widget's Confirm button. The model can never confirm an order.
// POST /orders/status: the widget's check on payment and delivery after Confirm.
// POST /feedback: thumbs up/down (and an optional comment) on one assistant reply.

import { serve } from "@hono/node-server";
import { confirmOrder, getOrderUpdates, sql } from "@talk2buy/tools";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { runAgent } from "./agent";
import { DEFAULT_MODEL } from "./models";

const PORT = Number(process.env.AGENT_PORT ?? 8787);
const MAX_MESSAGE_LENGTH = 2000;

type Project = { id: string; allowed_domains: string[] };

// Projects change rarely; reload at most once a minute.
let projects: { at: number; byId: Map<string, Project> } | null = null;
async function getProjects() {
  if (!projects || Date.now() - projects.at > 60_000) {
    const rows = await sql<Project[]>`select id, allowed_domains from projects`;
    projects = { at: Date.now(), byId: new Map(rows.map((p) => [p.id, p])) };
  }
  return projects.byId;
}

const hostOf = (origin: string) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

const allows = (project: Project, origin: string) => {
  const host = hostOf(origin);
  return !!host && project.allowed_domains.some((d) => host === d || host.endsWith(`.${d}`));
};

const app = new Hono();

// Browsers may call the API only from a domain some project allows.
const corsForProjects = cors({
  origin: async (origin) => ([...(await getProjects()).values()].some((p) => allows(p, origin)) ? origin : null),
  allowMethods: ["POST"],
  allowHeaders: ["Content-Type"],
});
app.use("/chat", corsForProjects);
app.use("/orders/*", corsForProjects);
app.use("/feedback", corsForProjects);

type Body = {
  project_id?: unknown; session_id?: unknown; message?: unknown; area?: unknown; user_token?: unknown;
  rating?: unknown; comment?: unknown; reply?: unknown; question?: unknown;
};
const optionalString = (v: unknown) => (typeof v === "string" && v ? v : undefined);

app.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => null) as Body | null;
  const { project_id, session_id, message, area } = body ?? {};
  if (typeof project_id !== "string" || typeof message !== "string" || typeof area !== "string" || !message.trim() || !area.trim()) {
    return c.json({ error: "project_id, message and area are required" }, 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) return c.json({ error: "Message is too long" }, 400);

  const project = (await getProjects()).get(project_id);
  if (!project) return c.json({ error: "Unknown project" }, 404);
  const origin = c.req.header("Origin");
  if (origin && !allows(project, origin)) return c.json({ error: "This site is not allowed for this project" }, 403);

  // The server owns session IDs: unknown or foreign sessions get a fresh one.
  let sessionId = typeof session_id === "string" ? session_id : null;
  if (sessionId) {
    const [row] = await sql<{ project_id: string }[]>`select project_id from conversations where session_id = ${sessionId}`;
    if (!row || row.project_id !== project.id) sessionId = null;
  }
  sessionId ??= crypto.randomUUID();

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: "session", data: JSON.stringify({ session_id: sessionId }) });
    try {
      // Events are written in order; the agent doesn't wait for each write.
      let writes = Promise.resolve();
      const input = { sessionId: sessionId!, projectId: project.id, area: area.trim(), message: message.trim(), userToken: optionalString(body?.user_token) };
      await runAgent(input, (e) => {
        writes = writes.then(() => stream.writeSSE({ event: e.type, data: JSON.stringify(e) }));
      });
      await writes;
      await stream.writeSSE({ event: "done", data: "{}" });
    } catch (err) {
      console.error(err);
      await stream.writeSSE({ event: "error", data: JSON.stringify({ message: "Something went wrong. Please try again." }) });
    }
  });
});

// Checks shared by the session endpoints: a known project, an allowed site and a session.
async function sessionRequest(c: Context) {
  const body = await c.req.json().catch(() => null) as Body | null;
  const { project_id, session_id } = body ?? {};
  if (typeof project_id !== "string" || typeof session_id !== "string") {
    return { error: c.json({ error: "project_id and session_id are required" }, 400) };
  }
  const project = (await getProjects()).get(project_id);
  if (!project) return { error: c.json({ error: "Unknown project" }, 404) };
  const origin = c.req.header("Origin");
  if (origin && !allows(project, origin)) return { error: c.json({ error: "This site is not allowed for this project" }, 403) };
  return { ctx: { projectId: project.id, sessionId: session_id, userToken: optionalString(body?.user_token) } };
}

app.post("/orders/status", async (c) => {
  const req = await sessionRequest(c);
  if (req.error) return req.error;
  const result = await getOrderUpdates({}, req.ctx);
  return c.json("error" in result ? { orders: [] } : result);
});

app.post("/orders/:id/confirm", async (c) => {
  const req = await sessionRequest(c);
  if (req.error) return req.error;
  try {
    const order = await confirmOrder(c.req.param("id"), req.ctx);
    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({ order });
  } catch (err) {
    // The store refused, e.g. the order was already confirmed.
    return c.json({ error: (err as Error).message }, 409);
  }
});

// Trimmed and capped; empty becomes null.
const clip = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

app.post("/feedback", async (c) => {
  const req = await sessionRequest(c);
  if (req.error) return req.error;
  const { rating, comment, reply, question } = (await c.req.json()) as Body;
  const replyText = clip(reply, 4000);
  if ((rating !== "up" && rating !== "down") || !replyText) return c.json({ error: "rating and reply are required" }, 400);

  const [row] = await sql<{ project_id: string }[]>`select project_id from conversations where session_id = ${req.ctx.sessionId}`;
  if (!row || row.project_id !== req.ctx.projectId) return c.json({ error: "Unknown session" }, 404);

  await sql`
    insert into feedback (session_id, project_id, rating, comment, reply, question, model)
    values (${req.ctx.sessionId}, ${req.ctx.projectId}, ${rating}, ${clip(comment, 1000)}, ${replyText}, ${clip(question, 2000)}, ${DEFAULT_MODEL})`;
  return c.json({ ok: true });
});

app.get("/health", (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: PORT }, () => console.log(`Talk2Buy agent listening on http://localhost:${PORT}`));
