/**
 * Exercises the voice pipeline end to end without touching the network:
 * a local mock stands in for api.sarvam.ai, and the real core module plus the
 * real text helpers do the work.
 *
 *   pnpm run check:voice
 *
 * Checks cover the happy paths (transcription, speech synthesis), the failure
 * paths the browser relies on (`fallback: "browser"` on a rejected key, on a
 * rate limit, on an unreachable upstream) and the text plumbing that keeps
 * markdown and citation chips out of the audio.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";

import {
  buildSilentWav,
  describeVoice,
  probeVoice,
  resolveVoiceConfig,
  sniffAudioType,
  synthesizeSpeech,
  toVoiceError,
  transcribeAudio,
  voiceErrorResponse,
  VoiceError,
} from "../lib/voice/core";
import {
  appendTranscript,
  chunkForSpeech,
  clampTranscript,
  collapseWhitespace,
  splitSentences,
  stripMarkdownForSpeech,
} from "../lib/voice/text";

/* ------------------------------------------------------------------ harness */

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
    return;
  }
  failures.push(detail ? `${name} — ${detail}` : name);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

async function expectVoiceError(
  name: string,
  run: () => Promise<unknown>,
  expected: { code: string; status: number; fallback?: string | null },
) {
  try {
    await run();
    check(name, false, "no error was thrown");
  } catch (error) {
    const voiceError = toVoiceError(error);
    const ok =
      voiceError.code === expected.code &&
      voiceError.status === expected.status &&
      (expected.fallback === undefined || voiceError.fallback === expected.fallback);
    check(
      name,
      ok,
      ok
        ? undefined
        : `got ${voiceError.code}/${voiceError.status}/fallback=${voiceError.fallback}, wanted ${expected.code}/${expected.status}/fallback=${expected.fallback}`,
    );
  }
}

/* -------------------------------------------------------------- mock Sarvam */

interface MockState {
  sttStatus: number;
  sttTranscript: string;
  ttsStatus: number;
  ttsBody: unknown;
  sttRequests: Array<{ hasFile: boolean; model?: string; language?: string; bytes: number; key?: string }>;
  ttsRequests: Array<Record<string, unknown>>;
  lastKey?: string;
}

function createMockSarvam(): { state: MockState; start: () => Promise<string>; stop: () => Promise<void> } {
  const state: MockState = {
    sttStatus: 200,
    sttTranscript: "What are the elements of burglary in California?",
    ttsStatus: 200,
    ttsBody: null,
    sttRequests: [],
    ttsRequests: [],
  };

  const wav = buildSilentWav(0.2, 22050);
  const wavBase64 = Buffer.from(wav).toString("base64");

  const handler = (request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = request.url ?? "";
      state.lastKey = request.headers["api-subscription-key"] as string | undefined;

      const send = (status: number, payload: unknown) => {
        const text = JSON.stringify(payload);
        response.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
        response.end(text);
      };

      if (!state.lastKey) {
        send(403, { error: "missing api-subscription-key" });
        return;
      }

      if (url.startsWith("/speech-to-text")) {
        const raw = body.toString("latin1");
        state.sttRequests.push({
          hasFile: raw.includes('name="file"') && raw.includes("filename="),
          model: /name="model"\r?\n\r?\n([^\r\n]*)/.exec(raw)?.[1],
          language: /name="language_code"\r?\n\r?\n([^\r\n]*)/.exec(raw)?.[1],
          bytes: body.length,
          key: state.lastKey,
        });
        if (state.sttStatus !== 200) {
          send(state.sttStatus, { error: { message: "upstream says no", code: "bad_request" } });
          return;
        }
        send(200, {
          request_id: "mock-stt",
          transcript: state.sttTranscript,
          language_code: state.sttTranscript ? "en-IN" : null,
        });
        return;
      }

      if (url.startsWith("/text-to-speech")) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(body.toString("utf8")) as Record<string, unknown>;
        } catch {
          /* reported below via the shape assertions */
        }
        state.ttsRequests.push(parsed);
        if (state.ttsStatus !== 200) {
          send(state.ttsStatus, { error: { message: "upstream says no", code: "bad_request" } });
          return;
        }
        if (state.ttsBody) {
          send(200, state.ttsBody);
          return;
        }
        send(200, { request_id: "mock-tts", audios: [wavBase64] });
        return;
      }

      send(404, { error: "unknown endpoint" });
    });
  };

  let server: Server | null = null;

  return {
    state,
    start: () =>
      new Promise<string>((resolve) => {
        server = createServer(handler);
        server.listen(0, "127.0.0.1", () => {
          const address = server?.address() as AddressInfo;
          resolve(`http://127.0.0.1:${address.port}`);
        });
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        if (!server) {
          resolve();
          return;
        }
        server.close(() => resolve());
        server = null;
      }),
  };
}

/* --------------------------------------------------------------- the checks */

function checkTextHelpers() {
  const answer = [
    "## Bottom line",
    "",
    "Burglary under **Penal Code § 459** requires entry into a structure with intent to commit a felony. [1]",
    "",
    "1. Entry — *any* part of the body or a tool counts ([p1](#law-authority:/codes?section=459)).",
    "2. Intent — formed before or at the moment of entry.",
    "",
    "> See also People v. Davis (1998) for the entry element.",
    "",
    "```json",
    '{"citation": "PEN 459"}',
    "```",
    "",
    "| Element | Source |",
    "| --- | --- |",
    "| Entry | [PEN 459](https://leginfo.legislature.ca.gov) |",
  ].join("\n");

  const spoken = stripMarkdownForSpeech(answer);
  check("strip removes citation chips", !/\[p?\d+\]/.test(spoken), spoken);
  check("strip removes markdown emphasis", !/[*_`#]/.test(spoken), spoken);
  check("strip removes link targets and urls", !/https?:/.test(spoken) && !/law-authority:/.test(spoken));
  check("strip removes fenced code", !spoken.includes("citation") && !spoken.includes("json"));
  check("strip keeps the prose", spoken.includes("Burglary under Penal Code section 459"), spoken.slice(0, 120));
  check("strip reads § as a word", spoken.includes("section 459"), spoken.slice(0, 160));
  check("strip drops table pipes", !spoken.includes("|"), spoken.slice(0, 200));

  const chunks = chunkForSpeech(spoken, 120);
  check("chunking produces more than one chunk", chunks.length > 1, `chunks=${chunks.length}`);
  check("every chunk respects the limit", chunks.every((chunk) => chunk.length <= 120), JSON.stringify(chunks));
  check(
    "chunking is lossless",
    chunks.join(" ") === collapseWhitespace(spoken),
    `joined=${chunks.join(" ").slice(0, 120)}`,
  );

  const monster = `${"word ".repeat(400)}end`;
  const monsterChunks = chunkForSpeech(monster, 100);
  check("long single sentence is split on words", monsterChunks.every((chunk) => chunk.length <= 100));
  check("split sentence is lossless", monsterChunks.join(" ") === collapseWhitespace(monster));

  const sentences = splitSentences("Under Cal. Penal Code § 211(a). He was charged. See e.g. Davis.");
  check("abbreviations are not sentence ends", sentences.length === 3, JSON.stringify(sentences));

  check(
    "appendTranscript joins with one space",
    appendTranscript("What is burglary", "in California?") === "What is burglary in California?",
  );
  check("appendTranscript keeps an empty box clean", appendTranscript("", "  elements  ") === "elements");
  check("clampTranscript trims runaway input", clampTranscript("x".repeat(50), 10) === "xxxxxxxxxx");
}

async function checkCore(origin: string) {
  const config = resolveVoiceConfig(
    {
      SARVAM_API_KEY: "test-key",
      SARVAM_VOICE_BASE_URL: origin,
    },
    "builtin-key",
  );

  check("env key wins over the built-in key", config.keySource === "env" && config.apiKey === "test-key");
  check("voice base URL is reused for both endpoints", config.sttUrl === `${origin}/speech-to-text` && config.ttsUrl === `${origin}/text-to-speech`);
  check("saaras keeps its mode", config.sttModel === "saaras:v3" && config.sttMode === "transcribe");
  check("TTS defaults are sane", config.ttsModel === "bulbul:v2" && config.speaker === "anushka" && config.language === "en-IN");

  const builtin = resolveVoiceConfig({}, "builtin-key");
  check("built-in key is used when the env var is absent", builtin.keySource === "builtin" && builtin.apiKey === "builtin-key");
  check(
    "the chat base URL (/v1) is normalised for voice",
    resolveVoiceConfig({ SARVAM_BASE_URL: "https://api.sarvam.ai/v1" }, "k").sttUrl ===
      "https://api.sarvam.ai/speech-to-text",
  );

  const described = describeVoice(config);
  check("describeVoice reports both features available", described.stt.available && described.tts.available);
  check("describeVoice never leaks the key", !JSON.stringify(described).includes("test-key"));

  const summary = describeVoice(resolveVoiceConfig({}, undefined));
  check("describeVoice reports unconfigured without a key", summary.stt.configured === false && summary.tts.available === false);

  await expectVoiceError(
    "no key -> NO_KEY/503 with browser fallback",
    () => transcribeAudio({ ...config, apiKey: "" }, { audio: buildSilentWav() }),
    { code: "NO_KEY", status: 503, fallback: "browser" },
  );
  await expectVoiceError(
    "empty recording -> EMPTY_AUDIO/400",
    () => transcribeAudio(config, { audio: new Uint8Array(0) }),
    { code: "EMPTY_AUDIO", status: 400 },
  );
  await expectVoiceError(
    "oversize speech text -> TEXT_TOO_LONG/413",
    () => synthesizeSpeech(config, { text: "a".repeat(1500) }),
    { code: "TEXT_TOO_LONG", status: 413, fallback: null },
  );
  await expectVoiceError(
    "empty speech text -> EMPTY_TEXT/400",
    () => synthesizeSpeech(config, { text: "   " }),
    { code: "EMPTY_TEXT", status: 400 },
  );
}

async function checkPipeline(mock: ReturnType<typeof createMockSarvam>, origin: string) {
  const config = resolveVoiceConfig(
    { SARVAM_API_KEY: "test-key", SARVAM_VOICE_BASE_URL: origin },
    "builtin-key",
  );

  const transcription = await transcribeAudio(config, {
    audio: buildSilentWav(0.3),
    filename: "dictation.webm",
    contentType: "audio/webm",
  });
  check("transcribe returns the upstream transcript", transcription.text.startsWith("What are the elements"), transcription.text);
  check("transcribe reports the detected language", transcription.language === "en-IN");
  const firstStt = mock.state.sttRequests.at(-1);
  check("transcribe uploads a file part", Boolean(firstStt?.hasFile), JSON.stringify(firstStt));
  check("transcribe sends the model", firstStt?.model === "saaras:v3", JSON.stringify(firstStt));
  check("transcribe sends the language hint", firstStt?.language === "unknown", JSON.stringify(firstStt));
  check("transcribe sends the subscription key header", firstStt?.key === "test-key");

  const speech = await synthesizeSpeech(config, { text: "Penal Code section 459." });
  check("speak returns audio bytes", speech.audio.byteLength > 44, `${speech.audio.byteLength} bytes`);
  check("speak sniffs the content type", speech.contentType === "audio/wav", speech.contentType);
  check("speak reports the model", speech.model === "bulbul:v2");
  const firstTts = mock.state.ttsRequests.at(-1) as { inputs?: string[]; speaker?: string; model?: string; enable_preprocessing?: boolean; target_language_code?: string } | undefined;
  check("speak sends the text as inputs[]", firstTts?.inputs?.[0] === "Penal Code section 459.", JSON.stringify(firstTts));
  check(
    "speak sends speaker/model/language/preprocessing",
    firstTts?.speaker === "anushka" &&
      firstTts?.model === "bulbul:v2" &&
      firstTts?.target_language_code === "en-IN" &&
      firstTts?.enable_preprocessing === true,
    JSON.stringify(firstTts),
  );

  // Empty transcript: the API answered, it just heard nothing.
  mock.state.sttTranscript = "";
  await expectVoiceError(
    "silent recording -> EMPTY_TRANSCRIPT/422 with browser fallback",
    () => transcribeAudio(config, { audio: buildSilentWav(0.2) }),
    { code: "EMPTY_TRANSCRIPT", status: 422, fallback: "browser" },
  );
  mock.state.sttTranscript = "restored";

  // Entitlement failure: exactly what a key without voice access looks like.
  mock.state.sttStatus = 403;
  await expectVoiceError(
    "rejected key -> NOT_ENTITLED/403 so the browser retries on-device",
    () => transcribeAudio(config, { audio: buildSilentWav(0.2) }),
    { code: "NOT_ENTITLED", status: 403, fallback: "browser" },
  );
  mock.state.sttStatus = 200;

  mock.state.ttsStatus = 429;
  await expectVoiceError(
    "rate limited -> RATE_LIMITED/429",
    () => synthesizeSpeech(config, { text: "hello" }),
    { code: "RATE_LIMITED", status: 429, fallback: "browser" },
  );
  mock.state.ttsStatus = 500;
  await expectVoiceError(
    "upstream outage -> UPSTREAM_ERROR/502",
    () => synthesizeSpeech(config, { text: "hello" }),
    { code: "UPSTREAM_ERROR", status: 502, fallback: "browser" },
  );
  mock.state.ttsStatus = 200;

  mock.state.ttsBody = { request_id: "mock", audios: [] };
  await expectVoiceError(
    "no audio in the response -> EMPTY_AUDIO/502",
    () => synthesizeSpeech(config, { text: "hello" }),
    { code: "EMPTY_AUDIO", status: 502, fallback: "browser" },
  );
  mock.state.ttsBody = null;

  const unreachable = { ...config, ttsUrl: "http://127.0.0.1:9/text-to-speech", timeoutMs: 2000 };
  await expectVoiceError(
    "unreachable upstream -> UPSTREAM_UNREACHABLE/502",
    () => synthesizeSpeech(unreachable, { text: "hello" }),
    { code: "UPSTREAM_UNREACHABLE", status: 502, fallback: "browser" },
  );

  const response = voiceErrorResponse(new VoiceError("NO_KEY", 503, "no key", { fallback: "browser" }));
  const payload = (await response.json()) as Record<string, unknown>;
  check(
    "voiceErrorResponse shapes the JSON the hooks read",
    response.status === 503 && payload.code === "NO_KEY" && payload.fallback === "browser",
    JSON.stringify(payload),
  );
}

async function checkProbe(mock: ReturnType<typeof createMockSarvam>, origin: string) {
  const config = resolveVoiceConfig(
    { SARVAM_API_KEY: "test-key", SARVAM_VOICE_BASE_URL: origin },
    "builtin-key",
  );

  const healthy = await probeVoice(config);
  check("probe reports TTS reachable", healthy.tts.ok, JSON.stringify(healthy.tts));
  check("probe reports STT reachable", healthy.stt.ok, JSON.stringify(healthy.stt));

  // A silent probe clip legitimately comes back empty; that still proves auth + transport.
  mock.state.sttTranscript = "";
  const silent = await probeVoice(config);
  check("probe accepts 'no speech detected' as reachable", silent.stt.ok && silent.stt.code === "EMPTY_TRANSCRIPT", JSON.stringify(silent.stt));
  mock.state.sttTranscript = "restored";

  mock.state.ttsStatus = 403;
  const denied = await probeVoice(config);
  check("probe surfaces a rejected key", !denied.tts.ok && denied.tts.code === "NOT_ENTITLED", JSON.stringify(denied.tts));
  mock.state.ttsStatus = 200;
}

function checkAudioHelpers() {
  const wav = buildSilentWav(0.1, 8000);
  check("silent WAV has a RIFF/WAVE header", Buffer.from(wav).subarray(0, 4).toString() === "RIFF" && Buffer.from(wav).subarray(8, 12).toString() === "WAVE");
  check("silent WAV length matches the sample count", wav.byteLength === 44 + Math.round(0.1 * 8000) * 2, `${wav.byteLength}`);
  check("sniff sees WAV", sniffAudioType(wav) === "audio/wav");
  check("sniff sees MP3 with an ID3 tag", sniffAudioType(Uint8Array.from([0x49, 0x44, 0x33, 0x03])) === "audio/mpeg");
  check("sniff sees MP3 frame sync", sniffAudioType(Uint8Array.from([0xff, 0xfb, 0x90, 0x00])) === "audio/mpeg");
  check("sniff sees Ogg", sniffAudioType(Uint8Array.from([0x4f, 0x67, 0x67, 0x53])) === "audio/ogg");
  check("sniff falls back to WAV", sniffAudioType(Uint8Array.from([0x00, 0x01, 0x02, 0x03])) === "audio/wav");
}

/* --------------------------------------------------------------------- main */

async function main() {
  const mock = createMockSarvam();
  const origin = await mock.start();
  console.log(`Mock Sarvam upstream listening on ${origin}`);

  section("Text helpers (what the reader hears)");
  checkTextHelpers();

  section("Config resolution");
  await checkCore(origin);

  section("Sarvam pipeline against the mock");
  await checkPipeline(mock, origin);

  section("Health probe");
  await checkProbe(mock, origin);

  section("Audio helpers");
  checkAudioHelpers();

  await mock.stop();

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length) {
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exitCode = 1;
  }
}

await main();
