// The tool-calling loop behind POST /chat: the model may call tools up to MAX_STEPS times per
// customer message, then must reply. History is kept in the conversations table.

import {
  runTool,
  sql,
  toolDefinitions,
  type CartView,
  type CreateOrderResult,
  type SearchProductsResult,
  type ToolContext,
} from "@talk2buy/tools";
import { streamChat, type ChatMessage, type LlmEvent } from "./llm";
import { DEFAULT_MODEL, getModel, type ModelId } from "./models";
import { systemPrompt } from "./prompt";

const MAX_STEPS = 5;
const HISTORY_TURNS = 10; // customer messages kept as context

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "products"; query: string; corrections: SearchProductsResult["corrections"]; products: SearchProductsResult["products"]; note?: string }
  | { type: "cart"; cart: CartView }
  | { type: "orders"; orders: Extract<CreateOrderResult, { status: "awaiting_confirmation" }>["orders"]; total: number };

export type AgentInput = {
  sessionId: string;
  projectId: string;
  area: string;
  message: string;
  userToken?: string;
  model?: ModelId;
  now?: Date;
};
export type AgentUsage = { promptTokens: number; cachedTokens: number; completionTokens: number; reasoningTokens: number };
export type AgentResult = { reply: string; toolCalls: { name: string; args: unknown; result: unknown }[]; usage: AgentUsage };

export async function runAgent(input: AgentInput, emit: (e: AgentEvent) => void = () => {}): Promise<AgentResult> {
  const model = getModel(input.model ?? DEFAULT_MODEL);
  const now = input.now ?? new Date();
  const ctx: ToolContext = {
    projectId: input.projectId,
    sessionId: input.sessionId,
    area: input.area,
    now,
    budget: { webLookups: 1 },
    userToken: input.userToken,
  };

  const history = await loadHistory(input.sessionId);
  const added: ChatMessage[] = [{ role: "user", content: input.message }];
  const toolCalls: AgentResult["toolCalls"] = [];
  let reply = "";
  const total: AgentUsage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0, reasoningTokens: 0 };

  for (let step = 1; step <= MAX_STEPS; step++) {
    // On the last step, tools are withheld so the model has to answer.
    const tools = step < MAX_STEPS ? toolDefinitions : undefined;
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(input.area, now) }, ...history, ...added];

    const started = performance.now();
    let done: Extract<LlmEvent, { type: "done" }> | undefined;
    let first = true;
    for await (const event of streamChat(model, messages, tools)) {
      if (event.type === "done") done = event;
      else {
        // Text from an earlier step ("I dey search now") is kept on its own line.
        if (first && reply) emit({ type: "text", delta: "\n" });
        first = false;
        emit(event);
      }
    }
    const { message, finishReason, usage } = done!;
    log({ event: "model_call", session: input.sessionId, model: model.id, step, latency_ms: Math.round(performance.now() - started),
      finish_reason: finishReason, tool_calls: message.tool_calls?.map((c) => c.function.name) ?? [], usage });
    total.promptTokens += usage?.prompt_tokens ?? 0;
    total.cachedTokens += usage?.prompt_tokens_details?.cached_tokens ?? 0;
    total.completionTokens += usage?.completion_tokens ?? 0;
    total.reasoningTokens += usage?.completion_tokens_details?.reasoning_tokens ?? 0;

    added.push(message);
    if (message.content) reply += (reply ? "\n" : "") + message.content;
    if (!message.tool_calls?.length) break;

    for (const call of message.tool_calls) {
      const args = parseArgs(call.function.arguments);
      const result = args === null
        ? { error: "Arguments were not valid JSON" }
        : await runTool(call.function.name, args, ctx).catch((err: Error) => ({ error: err.message }));
      toolCalls.push({ name: call.function.name, args, result });
      const event = toEvent(call.function.name, result);
      if (event) emit(event);
      added.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  await saveHistory(input.sessionId, input.projectId, added);
  return { reply, toolCalls, usage: total };
}

// What the widget shows for a tool result: product cards, the cart, or orders to confirm.
function toEvent(tool: string, result: unknown): AgentEvent | null {
  if (!result || typeof result !== "object" || "error" in result) return null;
  if (tool === "search_products") return { type: "products", ...(result as SearchProductsResult) };
  if (tool === "build_cart" || tool === "update_cart") return { type: "cart", cart: result as CartView };
  if (tool === "create_order") {
    const r = result as Exclude<CreateOrderResult, { error: string }>;
    return r.status === "cart_changed" ? { type: "cart", cart: r.cart } : { type: "orders", orders: r.orders, total: r.total };
  }
  return null;
}

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const [row] = await sql<{ messages: ChatMessage[] }[]>`select messages from conversations where session_id = ${sessionId}`;
  const messages = row?.messages ?? [];
  // Start at a customer message so tool calls are never separated from their results.
  const userIndexes = messages.flatMap((m, i) => (m.role === "user" ? [i] : []));
  return messages.slice(userIndexes.at(-HISTORY_TURNS) ?? 0);
}

async function saveHistory(sessionId: string, projectId: string, added: ChatMessage[]) {
  await sql`
    insert into conversations (session_id, project_id, messages)
    values (${sessionId}, ${projectId}, ${sql.json(added as never)})
    on conflict (session_id) do update
      set messages = conversations.messages || excluded.messages, updated_at = now()`;
}

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
}
