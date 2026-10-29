// Streams one chat completion, yielding reply text as it arrives and the complete message
// (including any tool calls) at the end. Thinking tokens are not streamed to the customer.

import type { ModelConfig } from "./models";

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
};

export type LlmEvent =
  | { type: "text"; delta: string }
  | { type: "done"; message: Extract<ChatMessage, { role: "assistant" }>; finishReason: string | null; usage: Usage | null };

// Reasoning models spend most of the budget thinking before they reply.
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60_000;

type Chunk = {
  choices?: { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
  usage?: Usage | null;
};

export async function* streamChat(model: ModelConfig, messages: ChatMessage[], tools?: readonly object[]): AsyncGenerator<LlmEvent> {
  const res = await fetch(`${model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${model.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model.model,
      messages,
      ...(tools?.length && { tools }),
      max_tokens: MAX_TOKENS,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok || !res.body) throw new Error(`${model.label}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);

  let content = "";
  const calls: ToolCall[] = [];
  let finishReason: string | null = null;
  let usage: Usage | null = null;

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const bytes of res.body) {
    buffer += decoder.decode(bytes, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      const chunk = JSON.parse(data) as Chunk;
      if (chunk.usage) usage = chunk.usage;
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      if (choice.delta?.content) {
        content += choice.delta.content;
        yield { type: "text", delta: choice.delta.content };
      }
      // Tool calls arrive in pieces, keyed by index.
      for (const part of choice.delta?.tool_calls ?? []) {
        const call = (calls[part.index] ??= { id: "", type: "function", function: { name: "", arguments: "" } });
        if (part.id) call.id = part.id;
        if (part.function?.name) call.function.name += part.function.name;
        if (part.function?.arguments) call.function.arguments += part.function.arguments;
      }
    }
  }

  const toolCalls = calls.filter(Boolean);
  yield {
    type: "done",
    message: { role: "assistant", content: content || null, ...(toolCalls.length && { tool_calls: toolCalls }) },
    finishReason,
    usage,
  };
}
