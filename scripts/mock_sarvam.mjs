#!/usr/bin/env node
/**
 * A stand-in for api.sarvam.ai so the voice routes can be exercised from a
 * machine that cannot reach Sarvam (the dev sandbox, CI, a locked-down laptop).
 *
 *   node scripts/mock_sarvam.mjs                  # port 8787, always succeeds
 *   node scripts/mock_sarvam.mjs --port 8787 --fail 403
 *   node scripts/mock_sarvam.mjs --transcript "What is burglary?"
 *
 * Then point the app at it:
 *
 *   SARVAM_VOICE_BASE_URL=http://127.0.0.1:8787 pnpm dev
 *
 * /speech-to-text answers with a fixed transcript, /text-to-speech answers with
 * a short silent WAV, and --fail makes both answer with that HTTP status so the
 * browser fallback path can be checked too.
 *
 * No dependencies: this only exists for local verification.
 */

import { createServer } from "node:http";
import { Buffer } from "node:buffer";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const port = Number.parseInt(arg("port", "8787"), 10);
const failStatus = Number.parseInt(arg("fail", "0"), 10);
const transcript = arg("transcript", "What are the elements of burglary in California?");

/** 16-bit mono PCM WAV of `seconds` of silence. */
function silentWav(seconds = 0.5, sampleRate = 22050) {
  const frames = Math.round(seconds * sampleRate);
  const dataBytes = frames * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

const WAV = silentWav();

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = request.url ?? "";
    const key = request.headers["api-subscription-key"];

    const json = (status, payload) => {
      const text = JSON.stringify(payload);
      response.writeHead(status, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(text),
      });
      response.end(text);
    };

    if (!key) {
      json(403, { error: { message: "missing api-subscription-key", code: "invalid_api_key" } });
      return;
    }

    if (failStatus) {
      json(failStatus, { error: { message: `mock failure ${failStatus}`, code: "mock_failure" } });
      return;
    }

    if (url.startsWith("/speech-to-text")) {
      console.log(`[mock] STT ${body.length} bytes → "${transcript}"`);
      json(200, { request_id: "mock-stt", transcript, language_code: "en-IN" });
      return;
    }

    if (url.startsWith("/text-to-speech")) {
      let parsed = {};
      try {
        parsed = JSON.parse(body.toString("utf8"));
      } catch {
        /* fall through with an empty payload */
      }
      const text = Array.isArray(parsed.inputs) ? parsed.inputs[0] : parsed.text;
      console.log(`[mock] TTS ${String(text ?? "").length} chars, speaker=${parsed.speaker ?? "-"}`);
      json(200, { request_id: "mock-tts", audios: [WAV.toString("base64")] });
      return;
    }

    json(404, { error: { message: "unknown endpoint", code: "not_found" } });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Mock Sarvam listening on http://127.0.0.1:${port}` +
      (failStatus ? ` (failing every request with ${failStatus})` : ""),
  );
});
