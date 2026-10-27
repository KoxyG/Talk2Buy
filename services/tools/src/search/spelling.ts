// Automatic typo correction against the words in pidgin_glossary ("jolof" -> "jollof").
// The customer is never asked to retype; corrections are returned so the reply can mention them.

import { sql } from "../db";

// Strict for the first search; looser for the single retry when nothing was found.
export const STRICT = 0.45;
export const LOOSE = 0.3;

export type Correction = { from: string; to: string };

export async function correctSpelling(query: string, threshold: number): Promise<{ query: string; corrections: Correction[] }> {
  const tokens = query.split(/\s+/).filter(Boolean);
  // Short words and sizes like "5kg" are left alone.
  const candidates = [...new Set(tokens.map((t) => t.toLowerCase()).filter((w) => w.length >= 4 && /^[a-z-]+$/.test(w)))];
  if (!candidates.length) return { query, corrections: [] };

  const rows = await sql<{ word: string; match: string | null }[]>`
    with vocab as (select distinct unnest(string_to_array(lower(term), ' ')) as w from pidgin_glossary)
    select q.word, best.w as match
    from unnest(${candidates}::text[]) as q(word)
    left join lateral (
      select w from vocab
      where similarity(w, q.word) >= ${threshold}
      order by similarity(w, q.word) desc
      limit 1
    ) best on true`;

  // Words with no close match ("pizza" when it isn't in the glossary) stay as typed.
  const fixes = new Map(rows.filter((r) => r.match && r.match !== r.word).map((r) => [r.word, r.match!]));
  return {
    query: tokens.map((t) => fixes.get(t.toLowerCase()) ?? t).join(" "),
    corrections: [...fixes].map(([from, to]) => ({ from, to })),
  };
}
