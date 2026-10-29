// The chat models Talk2Buy can run on. All use OpenAI-compatible /chat/completions endpoints.

export type ModelId = "spark" | "wonder" | "spark-open";
export type ModelConfig = { id: ModelId; label: string; baseUrl: string; apiKey: string; model: string };

// Values pasted into a hosting dashboard can keep a trailing space or an inline "# comment" that
// Node's --env-file would have dropped locally; both make the API answer model_not_found.
const env = (name: string) => {
  const value = process.env[name]?.replace(/\s+#.*$/, "").trim();
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
};

export function getModel(id: ModelId): ModelConfig {
  switch (id) {
    case "spark":
      return { id, label: "Muse Spark 1.3", baseUrl: env("META_BASE_URL"), apiKey: env("META_API_KEY"), model: env("SPARK_MODEL_ID") };
    case "wonder":
      return { id, label: "Muse Wonder", baseUrl: env("META_BASE_URL"), apiKey: env("META_API_KEY"), model: env("WONDER_MODEL_ID") };
    case "spark-open":
      return { id, label: "Muse Spark Open", baseUrl: env("BASETEN_BASE_URL"), apiKey: env("BASETEN_API_KEY"), model: env("SPARK_OPEN_MODEL_ID") };
  }
}

export const DEFAULT_MODEL: ModelId = (process.env.AGENT_MODEL as ModelId | undefined) ?? "spark";
