// POST /chat: takes a customer message and streams back the reply and product cards as
// server-sent events (session, text, products, done, error).

import { serve } from "@hono/node-server";
import { sql } from "@talk2buy/tools";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { runAgent } from "./agent";

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

// Browsers may call /chat only from a domain some project allows.
app.use("/chat", cors({
  origin: async (origin) => ([...(await getProjects()).values()].some((p) => allows(p, origin)) ? origin : null),
  allowMethods: ["POST"],
  allowHeaders: ["Content-Type"],
}));

app.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => null) as { project_id?: unknown; session_id?: unknown; message?: unknown; area?: unknown } | null;
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
      await runAgent({ sessionId: sessionId!, projectId: project.id, area: area.trim(), message: message.trim() }, (e) => {
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

app.get("/health", (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: PORT }, () => console.log(`Talk2Buy agent listening on http://localhost:${PORT}`));
