"use client";

/**
 * Reads GET /api/voice once per page load so the hooks know whether this
 * deployment can dictate and read aloud on the server, or whether they should
 * go straight to the browser's own Web Speech APIs.
 *
 * A failed probe resolves to `null` (unknown) rather than an error: the hooks
 * then try the server route first and fall back on the first failure.
 */

export interface VoiceFeatureCapability {
  engine?: string;
  configured?: boolean;
  available?: boolean;
  model?: string;
  language?: string;
  speaker?: string;
  maxChars?: number;
}

export interface VoiceCapabilities {
  stt: VoiceFeatureCapability;
  tts: VoiceFeatureCapability;
  fallback?: string;
}

let cached: Promise<VoiceCapabilities | null> | null = null;

function load(): Promise<VoiceCapabilities | null> {
  return fetch("/api/voice", { headers: { accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as { voice?: VoiceCapabilities };
      return payload?.voice ?? null;
    })
    .catch(() => null);
}

/** Probe once and share the answer between the dictation and read-aloud hooks. */
export function voiceCapabilities(): Promise<VoiceCapabilities | null> {
  if (!cached) cached = load();
  return cached;
}

/** Drop the cached probe (used after a server-side failure) and re-read it. */
export function refreshVoiceCapabilities(): Promise<VoiceCapabilities | null> {
  cached = load();
  return cached;
}

/** Test seam for the check script. */
export function __resetVoiceCapabilities() {
  cached = null;
}
