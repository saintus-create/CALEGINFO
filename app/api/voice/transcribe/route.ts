/**
 * POST /api/voice/transcribe — speech to text.
 *
 * Accepts either the multipart body the browser hook sends (`file` part) or a
 * raw audio body, forwards it to Sarvam, and answers with
 * `{ text, language, engine, model }`.
 *
 * Every failure carries `fallback: "browser"`, which tells the client hook to
 * retry dictation with the on-device Web Speech API instead of surfacing an
 * error the user cannot act on.
 */

import { SARVAM_KEY } from "@/lib/engine";
import { resolveVoiceConfig, transcribeAudio, voiceErrorResponse, VoiceError } from "@/lib/voice/core";
import { guardVoiceRequest } from "@/lib/voice/guard";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/voice/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Roughly two minutes of Opus audio, or one minute of 16-bit WAV. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
};

interface IncomingAudio {
  bytes: Uint8Array;
  filename?: string;
  contentType: string;
}

async function readAudio(request: Request): Promise<IncomingAudio> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new VoiceError("BAD_REQUEST", 400, "The recording could not be read from the request.");
    }

    const candidate = form.get("file") ?? form.get("audio") ?? form.get("recording");
    if (!candidate || typeof candidate === "string") {
      throw new VoiceError("NO_AUDIO", 400, "Attach the recording as a `file` form field.");
    }

    const file = candidate as File;
    const type = file.type?.split(";")[0].trim() || "audio/webm";
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: file.name || undefined,
      contentType: type,
    };
  }

  if (contentType.startsWith("audio/") || contentType === "application/octet-stream") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const declared = request.headers.get("x-audio-type")?.trim() || contentType;
    const type = declared.split(";")[0].trim() || "audio/webm";
    return {
      bytes,
      filename: request.headers.get("x-audio-filename")?.trim() || undefined,
      contentType: type,
    };
  }

  throw new VoiceError(
    "UNSUPPORTED_MEDIA_TYPE",
    415,
    "Send the recording as multipart/form-data or a raw audio/* body.",
  );
}

export async function POST(request: Request) {
  try {
    await guardVoiceRequest(request, { prefix: "transcribe", limit: 30, windowSeconds: 60 });

    const config = resolveVoiceConfig(process.env, SARVAM_KEY);
    const audio = await readAudio(request);

    if (!audio.bytes.byteLength) {
      throw new VoiceError("EMPTY_AUDIO", 400, "The recording was empty.");
    }
    if (audio.bytes.byteLength > MAX_UPLOAD_BYTES) {
      throw new VoiceError(
        "AUDIO_TOO_LARGE",
        413,
        `Recordings are limited to ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      );
    }

    const language = new URL(request.url).searchParams.get("language")?.trim() || undefined;

    const result = await transcribeAudio(config, {
      audio: audio.bytes,
      filename: audio.filename ?? `dictation.${AUDIO_EXTENSIONS[audio.contentType] ?? "webm"}`,
      contentType: audio.contentType,
      language,
    });

    return Response.json(
      {
        text: result.text.slice(0, MAX_TRANSCRIPT_CHARS),
        language: result.language,
        engine: "sarvam",
        model: result.model,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
