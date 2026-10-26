// Day 1 check: send one Pidgin message to each model and print the reply and latency.
// Both providers are called through their OpenAI-compatible /chat/completions endpoint.

type Target = { label: string; baseUrl?: string; apiKey?: string; model?: string };

const targets: Target[] = [
  {
    label: "Muse Glimmer (Baseten)",
    baseUrl: process.env.BASETEN_BASE_URL,
    apiKey: process.env.BASETEN_API_KEY,
    model: process.env.GLIMMER_MODEL_ID,
  },
  {
    label: "Muse Spark 1.3 (Meta Model API)",
    baseUrl: process.env.META_BASE_URL,
    apiKey: process.env.META_API_KEY,
    model: process.env.SPARK_MODEL_ID,
  },
];

const prompt = "Abeg find me jollof wey no pass 3k. Reply in one short sentence.";

async function ping(t: Target): Promise<boolean> {
  const missing = (["baseUrl", "apiKey", "model"] as const).filter((k) => !t[k]);
  if (missing.length) {
    console.log(`✗ ${t.label}: missing ${missing.join(", ")} in .env`);
    return false;
  }

  const started = performance.now();
  try {
    const res = await fetch(`${t.baseUrl!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: t.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const ms = Math.round(performance.now() - started);
    if (!res.ok) {
      console.log(`✗ ${t.label}: HTTP ${res.status} after ${ms}ms\n  ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    console.log(`✓ ${t.label} (${ms}ms)\n  ${data.choices?.[0]?.message?.content?.trim() ?? "(empty reply)"}`);
    return true;
  } catch (err) {
    console.log(`✗ ${t.label}: ${(err as Error).message}`);
    return false;
  }
}

const results = await Promise.all(targets.map(ping));
process.exit(results.every(Boolean) ? 0 : 1);
