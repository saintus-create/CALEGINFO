/**
 * Voice capability endpoint.
 *
 *   GET /api/voice          → what this deployment can do, and how it is wired
 *   GET /api/voice?probe=1  → additionally calls Sarvam STT + TTS for real
 *
 * The browser hooks read the first form to decide whether to dictate on the
 * server or fall back to the Web Speech API, and the probe exists so an
 * operator can verify a deployment without opening a microphone.
 */

import { SARVAM_KEY } from "@/lib/engine";
import { describeVoice, probeVoice, resolveVoiceConfig, voiceErrorResponse } from "@/lib/voice/core";
import { guardVoiceRequest } from "@/lib/voice/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = resolveVoiceConfig(process.env, SARVAM_KEY);
  const wantsProbe = /^(1|true|yes)$/i.test(new URL(request.url).searchParams.get("probe") ?? "");

  if (!wantsProbe) {
    return Response.json(
      { voice: describeVoice(config) },
      { headers: { "cache-control": "no-store" } },
    );
  }

  try {
    // The probe spends two upstream calls; keep it on a short leash.
    await guardVoiceRequest(request, { prefix: "probe", limit: 10, windowSeconds: 60 });
    const probe = await probeVoice(config);
    return Response.json(
      { voice: describeVoice(config), probe, ok: probe.tts.ok && probe.stt.ok },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
