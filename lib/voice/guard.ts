/**
 * Shared guards for the voice routes.
 *
 * Voice calls spend real money on a Sarvam subscription (and the deployment may
 * be running on the built-in key), so each route enforces the app's existing
 * Redis-backed rate limit when Upstash/KV is configured. Without those env vars
 * enforceRateLimit is a no-op and this simply adds nothing.
 */

import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { VoiceError } from "./core";

export function clientKey(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "anonymous"
  );
}

export async function guardVoiceRequest(
  request: Request,
  options: { prefix: string; limit: number; windowSeconds?: number },
): Promise<void> {
  try {
    await enforceRateLimit({
      key: clientKey(request),
      limit: options.limit,
      prefix: `voice:${options.prefix}`,
      windowSeconds: options.windowSeconds ?? 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new VoiceError(
        "RATE_LIMITED",
        429,
        "Too many voice requests. Wait a moment and try again.",
        { fallback: "browser", detail: `retry after ${error.retryAfter}s` },
      );
    }
    // A Redis outage must not take dictation down with it.
    console.warn("[api/voice] rate limit check skipped:", error);
  }
}
