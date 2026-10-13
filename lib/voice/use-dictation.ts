"use client";

/**
 * Dictation hook: turns microphone input into text for the composer.
 *
 * Two engines, one contract:
 *   1. "server"  — MediaRecorder → POST /api/voice/transcribe (Sarvam). Needs a
 *                  configured key, and works in every browser that can record.
 *   2. "browser" — the Web Speech API's on-device recogniser, used when the
 *                  server route is unavailable or rejects the key.
 *
 * The hook reports a growing transcript via `onTranscript(text, { final })`:
 * interim text arrives with `final: false` and the committed text (which the
 * composer appends to whatever it already held) arrives once with `final: true`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { collapseWhitespace } from "./text";
import { refreshVoiceCapabilities, voiceCapabilities, type VoiceCapabilities } from "./capabilities";

export type DictationState = "idle" | "recording" | "transcribing" | "error";
export type DictationEngine = "server" | "browser" | "none";

export interface UseDictationOptions {
  /** BCP-47 tag for the on-device recogniser (the server uses its own config). */
  language?: string;
  /** Auto-stop this long after the speaker goes quiet (server engine). */
  silenceMs?: number;
  /** Hard cap on one recording. */
  maxMs?: number;
  /** Fires as text arrives; `final: true` marks the committed transcript. */
  onTranscript?: (text: string, meta: { final: boolean }) => void;
  onError?: (message: string) => void;
  onNotice?: (message: string) => void;
}

export interface UseDictationResult {
  state: DictationState;
  engine: DictationEngine;
  elapsedMs: number;
  supported: boolean;
  start: () => void;
  stop: () => void;
  cancel: () => void;
  toggle: () => void;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
];

/** Below this RMS the microphone hears nothing worth transcribing. */
const SILENCE_RMS = 0.012;
const TICK_MS = 200;

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative | undefined;
}

interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult | undefined };
}

interface RecognitionErrorEvent {
  error?: string;
  message?: string;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function browserDictationSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function serverDictationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const supported = MediaRecorder.isTypeSupported?.bind(MediaRecorder);
  if (!supported) return undefined;
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (supported(candidate)) return candidate;
    } catch {
      /* Safari throws for unknown types instead of returning false */
    }
  }
  return undefined;
}

function extensionFor(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.includes("mp4")) return "m4a";
  if (base.includes("mpeg")) return "mp3";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("wav")) return "wav";
  return "webm";
}

export function microphoneErrorMessage(error: unknown): string {
  const name = (error as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow the microphone for this site and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found on this device.";
    case "NotReadableError":
      return "The microphone is already in use by another app.";
    default:
      return "The microphone could not be started.";
  }
}

const RECOGNITION_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow the microphone for this site and try again.",
  "service-not-allowed": "On-device dictation was blocked for this site.",
  "audio-capture": "No microphone was found on this device.",
  network: "On-device dictation needs a connection in this browser.",
};

export function useDictation(options: UseDictationOptions = {}): UseDictationResult {
  const [state, setState] = useState<DictationState>("idle");
  const [engine, setEngine] = useState<DictationEngine>("none");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [capabilities, setCapabilities] = useState<VoiceCapabilities | null>(null);
  // Engine support can only be known in the browser; reporting it during the
  // server render would make the first client render differ from the HTML.
  const [mounted, setMounted] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const engineRef = useRef<DictationEngine | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const recognitionRestartsRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const heardVoiceRef = useRef(false);
  // True only once level metering is actually running. Without a meter there is
  // no way to judge "silence", so the recording must be sent regardless.
  const meteringRef = useRef(false);
  const cancelledRef = useRef(false);
  const transcriptRef = useRef("");
  const stateRef = useRef<DictationState>("idle");
  stateRef.current = state;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    voiceCapabilities().then((value) => {
      if (!cancelled) setCapabilities(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const teardownCapture = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* nothing to abort */
      }
    }
  }, []);

  const finishInternal = useCallback(
    (next: DictationState) => {
      teardownCapture();
      setElapsedMs(0);
      setState(next);
    },
    [teardownCapture],
  );

  const reportError = useCallback(
    (message: string) => {
      optionsRef.current.onError?.(message);
      finishInternal("error");
    },
    [finishInternal],
  );

  /** Hand a finished recording to the server route. */
  const transcribeBlob = useCallback(
    async (blob: Blob, session: number) => {
      if (session !== sessionRef.current) return;
      setState("transcribing");

      const switchToBrowser = (message: string) => {
        engineRef.current = "browser";
        setEngine("browser");
        void refreshVoiceCapabilities().then((value) => setCapabilities(value));
        optionsRef.current.onNotice?.(
          `${message} Switched to on-device dictation — tap the mic and speak again.`,
        );
        finishInternal("idle");
      };

      try {
        const form = new FormData();
        form.append("file", blob, `dictation.${extensionFor(blob.type || "audio/webm")}`);
        const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
        const payload = (await response.json().catch(() => null)) as
          | { text?: string; error?: string; code?: string; fallback?: string }
          | null;

        if (session !== sessionRef.current) return;

        const text = collapseWhitespace(payload?.text ?? "");
        if (!response.ok || !text) {
          const message = payload?.error || "That recording could not be transcribed.";
          if (payload?.fallback === "browser" && browserDictationSupported()) {
            switchToBrowser(message);
            return;
          }
          reportError(message);
          return;
        }

        optionsRef.current.onTranscript?.(text, { final: true });
        finishInternal("idle");
      } catch {
        if (session !== sessionRef.current) return;
        if (browserDictationSupported()) {
          switchToBrowser("Could not reach the transcription service.");
          return;
        }
        reportError("Could not reach the transcription service. Check your connection.");
      }
    },
    [finishInternal, reportError],
  );

  const startServer = useCallback(async () => {
    const session = sessionRef.current;
    chunksRef.current = [];
    transcriptRef.current = "";

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      if (session === sessionRef.current) reportError(microphoneErrorMessage(error));
      return;
    }

    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;

    const mime = pickRecorderMime();
    let recorder: MediaRecorder | null = null;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      recorder = null;
    }

    if (!recorder) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      reportError("This browser cannot record audio; try on-device dictation in Chrome or Safari.");
      return;
    }

    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      if (session === sessionRef.current) reportError("The microphone stopped unexpectedly.");
    };
    recorder.onstop = () => {
      const parts = chunksRef.current;
      chunksRef.current = [];
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const cancelled = cancelledRef.current;
      const heardVoice = heardVoiceRef.current;
      const metering = meteringRef.current;
      const type = parts[0]?.type || recorder?.mimeType || mime || "audio/webm";
      const blob = new Blob(parts, { type });
      teardownCapture();

      if (cancelled || session !== sessionRef.current) return;
      if (!blob.size) {
        reportError("That recording came through empty. Check the microphone and try again.");
        return;
      }
      if (metering && !heardVoice) {
        optionsRef.current.onNotice?.("No speech was detected — nothing was added.");
        finishInternal("idle");
        return;
      }
      void transcribeBlob(blob, session);
    };

    try {
      recorder.start(250);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      reportError("The microphone could not be started.");
      return;
    }

    startedAtRef.current = Date.now();
    lastVoiceAtRef.current = Date.now();
    heardVoiceRef.current = false;
    meteringRef.current = false;
    cancelledRef.current = false;
    setElapsedMs(0);
    setState("recording");

    // Watch the input level so a pause can end the recording on its own.
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      const context = new Ctor();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      const silenceMs = Math.max(1200, optionsRef.current.silenceMs ?? 2600);
      const maxMs = Math.max(5000, optionsRef.current.maxMs ?? 120000);
      meteringRef.current = true;

      tickRef.current = setInterval(() => {
        if (session !== sessionRef.current) return;
        const now = Date.now();
        setElapsedMs(now - startedAtRef.current);

        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        if (rms > SILENCE_RMS) {
          heardVoiceRef.current = true;
          lastVoiceAtRef.current = now;
        }

        if (now - startedAtRef.current > maxMs) {
          stopRef.current?.();
          return;
        }
        if (heardVoiceRef.current && now - lastVoiceAtRef.current > silenceMs) {
          stopRef.current?.();
        }
      }, TICK_MS);
    } catch {
      // Level metering is a nicety: recording continues, the user stops it.
    }
  }, [finishInternal, reportError, teardownCapture, transcribeBlob]);

  /** On-device engine: the Web Speech recogniser, streamed into the composer. */
  const startBrowser = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      optionsRef.current.onError?.(
        "This browser cannot dictate. Try Chrome, Edge or Safari, or type the question.",
      );
      finishInternal("error");
      return;
    }

    const session = sessionRef.current;
    transcriptRef.current = "";
    recognitionRestartsRef.current = 0;
    cancelledRef.current = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");

    const begin = () => {
      if (session !== sessionRef.current) return;
      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.lang =
        optionsRef.current.language ||
        (typeof navigator !== "undefined" ? navigator.language : "") ||
        "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (session !== sessionRef.current) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alternative = result?.[0];
          if (!result || !alternative) continue;
          if (result.isFinal) {
            transcriptRef.current = collapseWhitespace(
              `${transcriptRef.current} ${alternative.transcript}`,
            );
          } else {
            interim += ` ${alternative.transcript}`;
          }
        }
        optionsRef.current.onTranscript?.(
          collapseWhitespace(`${transcriptRef.current} ${interim}`),
          { final: false },
        );
      };

      recognition.onerror = (event) => {
        if (session !== sessionRef.current) return;
        const code = event.error ?? "";
        if (code === "aborted" || code === "no-speech") return;
        const message = RECOGNITION_ERRORS[code];
        if (message) {
          cancelledRef.current = true;
          reportError(message);
        }
      };

      recognition.onend = () => {
        if (session !== sessionRef.current || cancelledRef.current) return;
        // Chrome ends a session after a pause; keep listening if the user has
        // not pressed stop yet.
        if (recognitionRestartsRef.current < 8 && stateRef.current === "recording") {
          recognitionRestartsRef.current += 1;
          begin();
          return;
        }
        const text = collapseWhitespace(transcriptRef.current);
        teardownCapture();
        setElapsedMs(0);
        if (text) {
          if (stateRef.current === "transcribing") {
            optionsRef.current.onTranscript?.(text, { final: true });
            setState("idle");
            return;
          }
          optionsRef.current.onTranscript?.(text, { final: false });
          return;
        }
        setState("idle");
      };

      try {
        recognition.start();
      } catch {
        reportError("Dictation could not start.");
      }
    };

    begin();

    const maxMs = Math.max(5000, optionsRef.current.maxMs ?? 120000);
    tickRef.current = setInterval(() => {
      if (session !== sessionRef.current) return;
      setElapsedMs(Date.now() - startedAtRef.current);
      if (Date.now() - startedAtRef.current > maxMs) stopRef.current?.();
    }, TICK_MS);
  }, [finishInternal, reportError, teardownCapture]);

  const stop = useCallback(() => {
    if (engineRef.current === "browser") {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      setState("transcribing");
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      return;
    }

    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      setState("transcribing");
      try {
        recorder.stop();
      } catch {
        reportError("The recording could not be stopped.");
      }
    }
  }, [reportError]);

  stopRef.current = stop;

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    cancelledRef.current = true;
    chunksRef.current = [];
    transcriptRef.current = "";
    teardownCapture();
    setElapsedMs(0);
    setState("idle");
  }, [teardownCapture]);

  const start = useCallback(() => {
    if (stateRef.current === "recording" || stateRef.current === "transcribing") return;
    sessionRef.current += 1;
    cancelledRef.current = false;

    const serverReady = capabilities?.stt?.available !== false && serverDictationSupported();
    const browserReady = browserDictationSupported();
    const chosen: DictationEngine =
      engineRef.current ?? (serverReady ? "server" : browserReady ? "browser" : "none");

    if (chosen === "none") {
      optionsRef.current.onError?.(
        "This browser cannot dictate. Try Chrome, Edge or Safari, or type the question.",
      );
      setState("error");
      return;
    }

    engineRef.current = chosen;
    setEngine(chosen);
    if (chosen === "browser") {
      startBrowser();
      return;
    }
    void startServer();
  }, [capabilities, startBrowser, startServer]);

  const toggle = useCallback(() => {
    if (stateRef.current === "recording") {
      stop();
      return;
    }
    if (stateRef.current === "idle" || stateRef.current === "error") start();
  }, [start, stop]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      cancelledRef.current = true;
      teardownCapture();
    };
  }, [teardownCapture]);

  const supported =
    mounted &&
    (capabilities?.stt?.available === false
      ? browserDictationSupported()
      : serverDictationSupported() || browserDictationSupported());

  return { state, engine, elapsedMs, supported, start, stop, cancel, toggle };
}

export default useDictation;
