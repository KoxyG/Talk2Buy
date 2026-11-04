// lookup_term: what a Pidgin or slang word means. Checks pidgin_glossary first, then the web
// (Brave Search, only if BRAVE_SEARCH_API_KEY is set). Returns a meaning and related words from
// glossary_links, never products or prices.

import { sql } from "../db";
import type { ToolContext } from "./products";

const FUZZY_MATCH = 0.5;
const WEB_TIMEOUT_MS = 3000;
const MAX_RELATED = 15;

type Related = { relation: string; term: string; verified: boolean };
export type LookupTermArgs = { term: string };
export type LookupTermResult = {
  meaning: string | null;
  normalized_query: string | null;
  source: "glossary" | "web" | "none";
  confidence: "high" | "medium" | "low" | "none";
  related: Related[];
};

const notFound: LookupTermResult = { meaning: null, normalized_query: null, source: "none", confidence: "none", related: [] };

export async function lookupTerm(args: LookupTermArgs, ctx: ToolContext): Promise<LookupTermResult> {
  const term = args.term.trim().toLowerCase();
  if (!term) return notFound;

  const [entry] = await sql<{ term: string; meaning: string; normalized_query: string | null; verified: boolean; score: number }[]>`
    select term, meaning, normalized_query, verified, similarity(lower(term), ${term}) as score
    from pidgin_glossary
    where lower(term) = ${term} or similarity(lower(term), ${term}) >= ${FUZZY_MATCH}
    order by score desc
    limit 1`;
  if (entry) {
    const exact = entry.term.toLowerCase() === term;
    return {
      meaning: entry.meaning,
      normalized_query: entry.normalized_query,
      source: "glossary",
      confidence: exact && entry.verified ? "high" : entry.verified ? "medium" : "low",
      related: await relatedTo(entry.term.toLowerCase()),
    };
  }

  // The model sometimes sends a whole phrase ("1 derica beans", "abeg find me ugu"): look for
  // glossary terms inside it. Words that point to a product beat filler like "abeg"; then the
  // longest wins, so "mama put" beats "put".
  const [inside] = await sql<{ term: string; meaning: string; normalized_query: string | null; verified: boolean }[]>`
    select term, meaning, normalized_query, verified
    from pidgin_glossary
    where ${` ${term} `} like '% ' || lower(term) || ' %'
    order by normalized_query is null, length(term) desc
    limit 1`;
  if (inside) {
    return {
      meaning: inside.meaning,
      normalized_query: inside.normalized_query,
      source: "glossary",
      confidence: inside.verified ? "medium" : "low",
      related: await relatedTo(inside.term.toLowerCase()),
    };
  }

  // One web lookup per customer message, so a confusing message can't slow every reply.
  if (!process.env.BRAVE_SEARCH_API_KEY || !ctx.budget || ctx.budget.webLookups <= 0) return notFound;
  ctx.budget.webLookups--;

  const meaning = await searchWeb(term);
  if (!meaning) return notFound;
  await sql`
    insert into pidgin_glossary (term, meaning, source, verified)
    values (${term}, ${meaning}, 'web', false)
    on conflict ((lower(term))) do nothing`;
  return { meaning, normalized_query: null, source: "web", confidence: "low", related: [] };
}

// How a term connects to others (glossary_links), one step out, verified links first. Links
// read both ways: "egusi made_with ugu" reads back from ugu as "used_in egusi", and
// "peak is_a evaporated milk" reads back as "kinds: peak".
async function relatedTo(term: string): Promise<Related[]> {
  return sql<Related[]>`
    select relation, term, verified from (
      select relation, to_term as term, verified from glossary_links where from_term = ${term}
      union all
      select case relation when 'made_with' then 'used_in' when 'is_a' then 'kinds' else relation end,
             from_term, verified
      from glossary_links where to_term = ${term} and relation <> 'from_region'
    ) links
    order by verified desc
    limit ${MAX_RELATED}`;
}

async function searchWeb(term: string): Promise<string | null> {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", `"${term}" Nigerian Pidgin meaning`);
    url.searchParams.set("count", "3");
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY! },
      signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { web?: { results?: { description?: string }[] } };
    const text = data.web?.results?.find((r) => r.description)?.description;
    return text ? text.replace(/<[^>]+>/g, "").slice(0, 300) : null;
  } catch {
    return null; // timeout or network error: the model asks the customer instead
  }
}
