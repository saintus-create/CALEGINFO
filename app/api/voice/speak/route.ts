/**
 * POST /api/voice/speak — text to speech.
 *
 * Body: `{ text, language?, speaker?, pace? }` (text ≤ SPEECH_MAX_CHARS; the
 * client splits long answers into chunks and streams them one after another).
 * Answers with raw audio bytes so the browser can play them straight from a
 * blob URL, plus `x-voice-*` headers describing what produced them.
 */

import { SARVAM_KEY } from "@/lib/engine";
import { resolveVoiceConfig, synthesizeSpeech, voiceErrorResponse, VoiceError } from "@/lib/voice/core";
import { guardVoiceRequest } from "@/lib/voice/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SpeakBody {
  text?: unknown;
  language?: unknown;
  speaker?: unknown;
  pace?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  try {
    await guardVoiceRequest(request, { prefix: "speak", limit: 60, windowSeconds: 60 });

    let body: SpeakBody;
    try {
      body = (await request.json()) as SpeakBody;
    } catch {
      throw new VoiceError("BAD_REQUEST", 400, "Expected a JSON body with a `text` field.");
    }

    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      throw new VoiceError("EMPTY_TEXT", 400, "There is nothing to read aloud.");
    }

    const pace = typeof body.pace === "number" && Number.isFinite(body.pace) ? body.pace : undefined;

    const config = resolveVoiceConfig(process.env, SARVAM_KEY);
    const speech = await synthesizeSpeech(config, {
      text,
      language: asString(body.language),
      speaker: asString(body.speaker),
      pace,
    });

    const bytes = new Uint8Array(speech.audio);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": speech.contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": "no-store",
        "x-voice-engine": "sarvam",
        "x-voice-model": speech.model,
      },
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
