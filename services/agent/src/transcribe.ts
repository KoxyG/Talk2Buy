// Turns a short voice clip (16 kHz mono WAV, base64) into text. Muse Spark Open on Baseten accepts
// audio and, unlike the Meta API, answers requests from our host. The transcript goes into the
// customer's input box, so it is checked and sent like typed text.

import { getModel } from "./models";

const TIMEOUT_MS = 30_000;
const PROMPT =
  "Transcribe the customer's speech exactly as spoken, in English or Nigerian Pidgin. Keep their words, " +
  "amounts and place names; don't translate or answer them. Reply with the transcript only.";

export async function transcribe(audio: string): Promise<string> {
  const model = getModel("spark-open");
  const res = await fetch(`${model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${model.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model.model,
      max_tokens: 2000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: [{ type: "input_audio", input_audio: { data: audio, format: "wav" } }] },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${model.label} transcribe: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  return (body.choices?.[0]?.message?.content ?? "").trim().replace(/^"(.*)"$/s, "$1");
}
