// Lets only a project's allowed sites put /embed in a frame, the way hosted KYC and checkout pages
// restrict who can embed them. The list comes from the agent; an unknown project can't be framed.

import { NextResponse, type NextRequest } from "next/server";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";

// "choppaddi.com" -> the site and its subdomains over HTTPS; "localhost" -> any local port.
const sources = (domain: string) =>
  domain === "localhost" ? ["http://localhost:*"] : [`https://${domain}`, `https://*.${domain}`];

export async function proxy(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project") ?? "";
  let domains: string[] = [];
  try {
    const res = await fetch(`${AGENT_URL}/projects/${encodeURIComponent(project)}/embed`);
    if (res.ok) domains = ((await res.json()) as { allowed_domains: string[] }).allowed_domains;
  } catch {
    // Agent unreachable: only Talk2Buy itself may frame the page.
  }
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${domains.flatMap(sources).join(" ")}`);
  return response;
}

export const config = { matcher: "/embed" };
