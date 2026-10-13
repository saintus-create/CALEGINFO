/**
 * Server-side voice core: Sarvam speech-to-text and text-to-speech.
 *
 * The app already talks to Sarvam for chat (see app/api/chat/route.ts). Voice
 * uses the same subscription key but a different API surface: a multipart
 * upload for transcription and a JSON call that returns base64 audio.
 *
 * Nothing here touches Next.js or `@/` aliases on purpose: the route handlers
 * stay thin, and scripts/check_voice.ts can drive this module end to end
 * against a mock upstream. Errors are always VoiceError, which carries both an
 * HTTP status for the response and a `fallback` hint telling the browser it may
 * retry with its own on-device Web Speech APIs.
 */

import { SPEECH_MAX_CHARS } from "./text";

export { SPEECH_MAX_CHARS };

export const DEFAULT_SARVAM_ORIGIN = "https://api.sarvam.ai";
export const DEFAULT_STT_MODEL = "saaras:v3";
export const DEFAULT_STT_MODE = "transcribe";
export const DEFAULT_STT_LANGUAGE = "unknown";
export const DEFAULT_TTS_MODEL = "bulbul:v2";
export const DEFAULT_TTS_SPEAKER = "anushka";
export const DEFAULT_TTS_LANGUAGE = "en-IN";

export type VoiceFallback = "browser";

export interface VoiceErrorOptions {
  fallback?: VoiceFallback | null;
  detail?: string;
}

/** An error a route can render directly: status, machine code, human message,
 *  and whether the browser should retry with its own speech APIs. */
export class VoiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fallback: VoiceFallback | null;
  readonly detail?: string;

  constructor(
    code: string,
    status: number,
    message: string,
    options: VoiceErrorOptions = {},
  ) {
    super(message);
    this.name = "VoiceError";
    this.code = code;
    this.status = status;
    this.fallback = options.fallback ?? null;
    this.detail = options.detail;
  }
}

/** Anything env-shaped: `process.env` works, and tests can pass a literal. */
export type VoiceEnv = Record<string, string | undefined>;

export interface VoiceConfig {
  apiKey: string;
  keySource: "env" | "builtin" | "none";
  sttUrl: string;
  ttsUrl: string;
  sttModel: string;
  sttMode: string | null;
  sttLanguage: string;
  ttsModel: string;
  speaker: string;
  language: string;
  pace: number;
  sttEnabled: boolean;
  ttsEnabled: boolean;
  timeoutMs: number;
}

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** `https://api.sarvam.ai/v1` (the chat base) and `https://api.sarvam.ai`
 *  (the voice base) differ by one path segment. Strip it rather than making
 *  operators configure the same host twice. */
function voiceOrigin(raw: string | undefined): string {
  const base = firstNonEmpty(raw) ?? DEFAULT_SARVAM_ORIGIN;
  return base.replace(/\/+$/, "").replace(/\/v1$/, "").replace(/\/+$/, "");
}

function endpoint(origin: string, override: string | undefined, path: string): string {
  const explicit = firstNonEmpty(override);
  if (explicit) return explicit;
  return `${origin}${path}`;
}

/**
 * Resolve voice settings from the environment. `fallbackKey` is the built-in
 * key shipped in lib/engine.js — the same one the chat route falls back to —
 * so voice keeps working on a deployment that never set SARVAM_API_KEY.
 */
export function resolveVoiceConfig(
  env: VoiceEnv = process.env,
  fallbackKey?: string,
): VoiceConfig {
  const envKey = firstNonEmpty(env.SARVAM_API_KEY);
  const builtinKey = firstNonEmpty(fallbackKey) ?? firstNonEmpty(env.SARVAM_VOICE_API_KEY);
  const apiKey = envKey ?? builtinKey ?? "";

  const origin = voiceOrigin(
    firstNonEmpty(env.SARVAM_VOICE_BASE_URL, env.SARVAM_VOICE_BASE, env.SARVAM_BASE_URL),
  );

  const sttModel = firstNonEmpty(env.SARVAM_STT_MODEL) ?? DEFAULT_STT_MODEL;
  const sttModeEnv = env.SARVAM_STT_MODE?.trim().toLowerCase();
  const sttMode =
    sttModeEnv === undefined
      ? DEFAULT_STT_MODE
      : sttModeEnv === "off" || sttModeEnv === "none"
        ? null
        : sttModeEnv;

  const paceRaw = Number.parseFloat(firstNonEmpty(env.SARVAM_TTS_PACE) ?? "");
  const pace = Number.isFinite(paceRaw) ? Math.min(2, Math.max(0.5, paceRaw)) : 1;

  const timeoutRaw = Number.parseInt(firstNonEmpty(env.SARVAM_VOICE_TIMEOUT_MS) ?? "", 10);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 1000 ? timeoutRaw : 45000;

  return {
    apiKey,
    keySource: envKey ? "env" : builtinKey ? "builtin" : "none",
    sttUrl: endpoint(origin, env.SARVAM_STT_URL, "/speech-to-text"),
    ttsUrl: endpoint(origin, env.SARVAM_TTS_URL, "/text-to-speech"),
    sttModel,
    // `mode` is only meaningful for the saaras family; saarika rejects it.
    sttMode: sttModel.startsWith("saaras") ? sttMode : null,
    sttLanguage: firstNonEmpty(env.SARVAM_STT_LANGUAGE) ?? DEFAULT_STT_LANGUAGE,
    ttsModel: firstNonEmpty(env.SARVAM_TTS_MODEL) ?? DEFAULT_TTS_MODEL,
    speaker: firstNonEmpty(env.SARVAM_TTS_SPEAKER, env.SARVAM_TTS_VOICE) ?? DEFAULT_TTS_SPEAKER,
    language: firstNonEmpty(env.SARVAM_TTS_LANGUAGE) ?? DEFAULT_TTS_LANGUAGE,
    pace,
    sttEnabled: flag(env.SARVAM_STT_ENABLED, true),
    ttsEnabled: flag(env.SARVAM_TTS_ENABLED, true),
    timeoutMs,
  };
}

export interface TranscribeInput {
  audio: Uint8Array;
  filename?: string;
  contentType?: string;
  language?: string;
}

export interface TranscribeResult {
  text: string;
  language: string | null;
  model: string;
}

export interface SpeakInput {
  text: string;
  language?: string;
  speaker?: string;
  pace?: number;
}

export interface SpeakResult {
  audio: Uint8Array;
  contentType: string;
  model: string;
}

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/opus": "opus",
};

function filenameFor(contentType: string): string {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return `dictation.${EXTENSIONS[base] ?? "webm"}`;
}

function requireKey(config: VoiceConfig, feature: "speech-to-text" | "text-to-speech") {
  if (!config.apiKey) {
    throw new VoiceError(
      "NO_KEY",
      503,
      `No Sarvam API key is configured, so ${feature} is unavailable.`,
      { fallback: "browser" },
    );
  }
}

/** Map an upstream failure onto a VoiceError with a status the browser can act
 *  on. Any 4xx that is not a rate limit means the key cannot use the feature,
 *  which is exactly when the on-device fallback should take over. */
function upstreamError(label: string, status: number, body: unknown): VoiceError {
  const detail = summarizeUpstream(body);
  const withDetail = (message: string, code: string, mapped: number) =>
    new VoiceError(code, mapped, `${label} failed: ${message}`, {
      fallback: "browser",
      detail,
    });

  if (status === 401 || status === 403 || status === 402) {
    return withDetail(
      "the Sarvam subscription key was rejected or is out of credits",
      "NOT_ENTITLED",
      403,
    );
  }
  if (status === 429) {
    return withDetail("the speech service rate-limited the request", "RATE_LIMITED", 429);
  }
  if (status === 400 || status === 422) {
    return withDetail("the speech service rejected the payload", "UPSTREAM_REJECTED", 400);
  }
  if (status === 404) {
    return withDetail("the speech endpoint was not found", "UPSTREAM_NOT_FOUND", 502);
  }
  if (status >= 500) {
    return withDetail("the speech service is having trouble", "UPSTREAM_ERROR", 502);
  }
  return withDetail(`unexpected status ${status}`, "UPSTREAM_ERROR", 502);
}

function summarizeUpstream(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function networkError(label: string, error: unknown): VoiceError {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return new VoiceError(
    "UPSTREAM_UNREACHABLE",
    502,
    `${label} could not be reached from this deployment.`,
    { fallback: "browser", detail },
  );
}

async function request(
  label: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw networkError(label, error);
  }
}

/**
 * Transcribe one recording. Sarvam expects multipart form-data with a `file`
 * part plus the model and (optionally) a BCP-47 language hint.
 */
export async function transcribeAudio(
  config: VoiceConfig,
  input: TranscribeInput,
): Promise<TranscribeResult> {
  if (!config.sttEnabled) {
    throw new VoiceError("STT_DISABLED", 503, "Speech-to-text is turned off on this deployment.", {
      fallback: "browser",
    });
  }
  requireKey(config, "speech-to-text");
  if (!input.audio?.byteLength) {
    throw new VoiceError("EMPTY_AUDIO", 400, "The recording was empty.");
  }

  const contentType = input.contentType?.split(";")[0].trim() || "audio/webm";
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.audio)], { type: contentType }),
    input.filename || filenameFor(contentType),
  );
  form.append("model", config.sttModel);
  if (config.sttMode) form.append("mode", config.sttMode);
  form.append("language_code", input.language?.trim() || config.sttLanguage);

  const response = await request(
    "Sarvam speech-to-text",
    config.sttUrl,
    {
      method: "POST",
      headers: { "api-subscription-key": config.apiKey },
      body: form,
    },
    config.timeoutMs,
  );

  const body = await readBody(response);
  if (!response.ok) throw upstreamError("Transcription", response.status, body);

  const record = (body ?? {}) as Record<string, unknown>;
  const text = typeof record.transcript === "string" ? record.transcript.trim() : "";
  if (!text) {
    throw new VoiceError("EMPTY_TRANSCRIPT", 422, "No speech was detected in that recording.", {
      fallback: "browser",
    });
  }

  return {
    text,
    language: typeof record.language_code === "string" ? record.language_code : null,
    model: config.sttModel,
  };
}

/**
 * Synthesize one chunk of text. Sarvam answers with base64-encoded audio in an
 * `audios` array; decode it here and hand raw bytes to the browser.
 */
export async function synthesizeSpeech(
  config: VoiceConfig,
  input: SpeakInput,
): Promise<SpeakResult> {
  if (!config.ttsEnabled) {
    throw new VoiceError("TTS_DISABLED", 503, "Read aloud is turned off on this deployment.", {
      fallback: "browser",
    });
  }
  requireKey(config, "text-to-speech");

  const text = String(input.text ?? "").trim();
  if (!text) {
    throw new VoiceError("EMPTY_TEXT", 400, "There is nothing to read aloud.");
  }
  if (text.length > SPEECH_MAX_CHARS) {
    throw new VoiceError(
      "TEXT_TOO_LONG",
      413,
      `Read aloud accepts up to ${SPEECH_MAX_CHARS} characters per request; send the text in chunks.`,
    );
  }

  const pace = Number.isFinite(input.pace) ? Math.min(2, Math.max(0.5, input.pace as number)) : config.pace;

  const response = await request(
    "Sarvam text-to-speech",
    config.ttsUrl,
    {
      method: "POST",
      headers: {
        "api-subscription-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: input.language?.trim() || config.language,
        speaker: input.speaker?.trim() || config.speaker,
        model: config.ttsModel,
        pace,
        // Expands "Pen. Code § 211" style input into something speakable.
        enable_preprocessing: true,
      }),
    },
    config.timeoutMs,
  );

  const body = await readBody(response);
  if (!response.ok) throw upstreamError("Speech synthesis", response.status, body);

  const record = (body ?? {}) as Record<string, unknown>;
  const audios = Array.isArray(record.audios) ? record.audios : [];
  const encoded = audios.find((entry): entry is string => typeof entry === "string" && entry.length > 0);
  if (!encoded) {
    throw new VoiceError("EMPTY_AUDIO", 502, "The speech service returned no audio.", {
      fallback: "browser",
      detail: summarizeUpstream(body),
    });
  }

  const audio = base64ToBytes(encoded);
  if (!audio.byteLength) {
    throw new VoiceError("EMPTY_AUDIO", 502, "The speech service returned empty audio.", {
      fallback: "browser",
    });
  }

  return {
    audio,
    contentType: sniffAudioType(audio),
    model: config.ttsModel,
  };
}

export function base64ToBytes(encoded: string): Uint8Array {
  const payload = encoded.includes(",") && /^data:/i.test(encoded)
    ? encoded.slice(encoded.indexOf(",") + 1)
    : encoded;

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(payload, "base64"));
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Pick a content type from the audio's own header bytes rather than trusting
 *  whatever the upstream said (or didn't say). */
export function sniffAudioType(bytes: Uint8Array): string {
  const head = (offset: number, ascii: string) =>
    ascii.split("").every((char, index) => bytes[offset + index] === char.charCodeAt(0));

  if (bytes.length >= 12 && head(0, "RIFF") && head(8, "WAVE")) return "audio/wav";
  if (bytes.length >= 4 && head(0, "OggS")) return "audio/ogg";
  if (bytes.length >= 4 && head(0, "fLaC")) return "audio/flac";
  if (bytes.length >= 3 && head(0, "ID3")) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (bytes.length >= 12 && head(4, "ftyp")) return "audio/mp4";
  if (bytes.length >= 4 && head(0, "#!AMR")) return "audio/amr";
  return "audio/wav";
}

/** A tiny silent WAV, used to prove the STT endpoint answers without shipping
 *  any fixture audio in the repository. */
export function buildSilentWav(seconds = 0.4, sampleRate = 16000): Uint8Array {
  const frames = Math.max(1, Math.round(seconds * sampleRate));
  const dataBytes = frames * 2; // 16-bit mono PCM
  const buffer = new Uint8Array(44 + dataBytes);
  const view = new DataView(buffer.buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  return buffer;
}

export interface ProbeResult {
  ok: boolean;
  code?: string;
  detail?: string;
}

export interface VoiceProbe {
  tts: ProbeResult & { bytes?: number; contentType?: string };
  stt: ProbeResult & { transcript?: string; note?: string };
}

/**
 * Actually call both upstream endpoints. `/api/voice?probe=1` uses this so an
 * operator can confirm the deployment is live rather than merely configured.
 *
 * The STT probe posts silence; a 200 with an empty transcript (or the
 * EMPTY_TRANSCRIPT rejection, which still means auth and transport worked) both
 * count as reachable.
 */
export async function probeVoice(config: VoiceConfig): Promise<VoiceProbe> {
  const result: VoiceProbe = {
    tts: { ok: false },
    stt: { ok: false },
  };

  try {
    const speech = await synthesizeSpeech(config, { text: "California." });
    result.tts = {
      ok: true,
      bytes: speech.audio.byteLength,
      contentType: speech.contentType,
    };
  } catch (error) {
    const voiceError = toVoiceError(error);
    result.tts = {
      ok: false,
      code: voiceError.code,
      detail: voiceError.detail ?? voiceError.message,
    };
  }

  try {
    const transcript = await transcribeAudio(config, {
      audio: buildSilentWav(),
      filename: "probe.wav",
      contentType: "audio/wav",
    });
    result.stt = { ok: true, transcript: transcript.text };
  } catch (error) {
    const voiceError = toVoiceError(error);
    if (voiceError.code === "EMPTY_TRANSCRIPT") {
      result.stt = {
        ok: true,
        code: voiceError.code,
        note: "Endpoint reachable; it reported no speech in the silent probe clip.",
      };
    } else {
      result.stt = {
        ok: false,
        code: voiceError.code,
        detail: voiceError.detail ?? voiceError.message,
      };
    }
  }

  return result;
}

export function toVoiceError(error: unknown): VoiceError {
  if (error instanceof VoiceError) return error;
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return new VoiceError("INTERNAL", 500, "The voice service hit an unexpected error.", {
    fallback: "browser",
    detail,
  });
}

/** Render any thrown value as the JSON error shape the browser hooks expect. */
export function voiceErrorResponse(error: unknown): Response {
  const voiceError = toVoiceError(error);
  if (voiceError.code === "INTERNAL") {
    console.error("[api/voice]", voiceError.detail ?? voiceError.message);
  }
  return Response.json(
    {
      error: voiceError.message,
      code: voiceError.code,
      detail: voiceError.detail,
      fallback: voiceError.fallback,
      engine: "sarvam",
    },
    { status: voiceError.status, headers: { "cache-control": "no-store" } },
  );
}

/** Public (key-free) description of one voice feature, for GET /api/voice. */
export interface VoiceFeatureStatus {
  engine: "sarvam";
  configured: boolean;
  available: boolean;
  model: string;
  endpoint: string;
  keySource: VoiceConfig["keySource"];
  language: string;
}

export function describeVoice(config: VoiceConfig): {
  stt: VoiceFeatureStatus & { mode: string | null };
  tts: VoiceFeatureStatus & { speaker: string; pace: number; maxChars: number };
  fallback: string;
} {
  return {
    stt: {
      engine: "sarvam",
      configured: Boolean(config.apiKey),
      available: config.sttEnabled && Boolean(config.apiKey),
      model: config.sttModel,
      mode: config.sttMode,
      endpoint: config.sttUrl,
      keySource: config.keySource,
      language: config.sttLanguage,
    },
    tts: {
      engine: "sarvam",
      configured: Boolean(config.apiKey),
      available: config.ttsEnabled && Boolean(config.apiKey),
      model: config.ttsModel,
      endpoint: config.ttsUrl,
      keySource: config.keySource,
      language: config.language,
      speaker: config.speaker,
      pace: config.pace,
      maxChars: SPEECH_MAX_CHARS,
    },
    fallback: "browser-web-speech",
  };
}
