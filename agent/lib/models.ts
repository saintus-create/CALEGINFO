/**
 * Model registry. The default is Sarvam 105B; additional models come from the
 * ALTERNATE_MODELS_JSON env var, each pointing at any OpenAI-compatible
 * endpoint (OpenRouter, Together, a local vLLM/Ollama server, ...):
 *
 * ALTERNATE_MODELS_JSON=[
 *   {"id":"llama-3.3-70b","name":"Llama 3.3 70B",
 *    "apiBase":"https://openrouter.ai/api/v1",
 *    "model":"meta-llama/llama-3.3-70b-instruct",
 *    "apiKeyEnv":"OPENROUTER_API_KEY"}
 * ]
 *
 * An alternate is only listed/served when its apiKeyEnv variable is set.
 */
export interface AlternateModel {
  id: string;
  name?: string;
  apiBase: string;
  model: string;
  apiKeyEnv?: string;
  headers?: Record<string, string>;
}

export const DEFAULT_MODEL_ID = "sarvam-105b-conversations";
export const DEFAULT_MODEL_NAME = "Sarvam 105B";

export function alternateModels(): AlternateModel[] {
  try {
    const raw = process.env.ALTERNATE_MODELS_JSON;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is AlternateModel =>
        !!m && typeof m === "object" && typeof m.id === "string" && typeof m.apiBase === "string" && typeof m.model === "string",
    );
  } catch {
    return [];
  }
}

export function alternateApiKey(alt: AlternateModel): string | undefined {
  const envName = alt.apiKeyEnv || "ALTERNATE_API_KEY";
  const v = process.env[envName];
  return v && v.length > 0 ? v : undefined;
}

export interface ServedModel {
  id: string;
  name: string;
}

/** Models the server can actually serve right now (used by /api/models). */
export function servedModels(): ServedModel[] {
  const out: ServedModel[] = [
    { id: DEFAULT_MODEL_ID, name: DEFAULT_MODEL_NAME },
  ];
  for (const alt of alternateModels()) {
    if (alternateApiKey(alt)) {
      out.push({ id: alt.id, name: alt.name || alt.id });
    }
  }
  return out;
}
