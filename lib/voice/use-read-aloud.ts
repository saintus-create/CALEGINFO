"use client";

/**
 * Read-aloud hook: plays an assistant answer through the speakers.
 *
 * Preferred path is the server's Sarvam voices: the text is cleaned of markdown
 * and citation chips, split at sentence boundaries, and fetched chunk by chunk
 * (`/api/voice/speak`) with the next chunk pre-fetched while the current one
 * plays, so long answers start speaking almost immediately.
 *
 * If the server route is unavailable or rejects the key, playback falls back to
 * the browser's own `speechSynthesis` for the rest of the page's lifetime.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, stripMarkdownForSpeech } from "./text";
import { voiceCapabilities } from "./capabilities";

export type ReadAloudState = "idle" | "loading" | "speaking";
export type ReadAloudEngine = "sarvam" | "browser" | null;

export interface UseReadAloudOptions {
  /** BCP-47 tag for the on-device voice (the server uses its own config). */
  language?: string;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
}

export interface UseReadAloudResult {
  state: ReadAloudState;
  engine: ReadAloudEngine;
  speakingId: string | null;
  supported: boolean;
  speak: (text: string, id: string) => void;
  stop: () => void;
  toggle: (text: string, id: string) => void;
}

/** A one-sample silent WAV: playing it inside the click handler primes the
 *  shared <audio> element so later chunk playback is not treated as autoplay. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";

interface Chunk {
  // Explicitly ArrayBuffer-backed: Blob() rejects SharedArrayBuffer views.
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
}

type ChunkResult = { ok: true; chunk: Chunk } | { ok: false; error: unknown };

function speechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(synth: SpeechSynthesis, language: string): SpeechSynthesisVoice | null {
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = synth.getVoices();
  } catch {
    return null;
  }
  if (!voices.length) return null;

  const wanted = language.toLowerCase();
  const base = wanted.split("-")[0];
  const exact = voices.find((voice) => voice.lang?.toLowerCase() === wanted);
  if (exact) return exact;
  const sameLanguage = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(base));
  return (
    sameLanguage.find((voice) => voice.localService) ??
    sameLanguage[0] ??
    voices.find((voice) => voice.default) ??
    voices[0] ??
    null
  );
}

export function useReadAloud(options: UseReadAloudOptions = {}): UseReadAloudResult {
  const [state, setState] = useState<ReadAloudState>("idle");
  const [engine, setEngine] = useState<ReadAloudEngine>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [serverAvailable, setServerAvailable] = useState(true);
  // Same hydration rule as dictation: only the browser knows about speech APIs.
  const [mounted, setMounted] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const engineRef = useRef<ReadAloudEngine>(null);
  const sessionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    voiceCapabilities().then((value) => {
      if (!cancelled && value) setServerAvailable(value.tts?.available !== false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getAudio = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* not playing */
      }
      audio.removeAttribute("src");
    }
    if (speechSynthesisAvailable()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* nothing queued */
      }
    }
    setState("idle");
    setSpeakingId(null);
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    reset();
  }, [reset]);

  const fetchChunk = useCallback(
    async (text: string, signal: AbortSignal): Promise<Chunk> => {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, language: optionsRef.current.language }),
        signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; fallback?: string }
          | null;
        throw new Error(payload?.error || `Read aloud failed (${response.status}).`);
      }

      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") || "audio/wav",
      };
    },
    [],
  );

  const playChunk = useCallback(
    async (chunk: Chunk, signal: AbortSignal) => {
      const audio = getAudio();
      if (!audio) return;

      const url = URL.createObjectURL(new Blob([chunk.bytes], { type: chunk.contentType }));
      try {
        audio.src = url;
        await audio.play();
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            signal.removeEventListener("abort", onAborted);
          };
          const onEnded = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("The audio could not be played."));
          };
          const onAborted = () => {
            cleanup();
            resolve();
          };
          audio.addEventListener("ended", onEnded);
          audio.addEventListener("error", onError);
          signal.addEventListener("abort", onAborted);
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [getAudio],
  );

  const speakWithBrowser = useCallback(
    (chunks: string[], session: number) => {
      if (!speechSynthesisAvailable()) {
        optionsRef.current.onError?.(
          "Read aloud is not supported in this browser, and the server voice is unavailable.",
        );
        reset();
        return;
      }

      const synth = window.speechSynthesis;
      const language =
        optionsRef.current.language ||
        (typeof navigator !== "undefined" ? navigator.language : "") ||
        "en-US";
      const voice = pickVoice(synth, language);

      try {
        synth.cancel();
      } catch {
        /* nothing queued */
      }

      engineRef.current = "browser";
      setEngine("browser");
      setState("speaking");

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = language;
        if (voice) utterance.voice = voice;
        if (index === chunks.length - 1) {
          utterance.onend = () => {
            if (session === sessionRef.current) {
              setState("idle");
              setSpeakingId(null);
            }
          };
          utterance.onerror = () => {
            if (session === sessionRef.current) reset();
          };
        }
        synth.speak(utterance);
      });
    },
    [reset],
  );

  const runServer = useCallback(
    async (chunks: string[], session: number, signal: AbortSignal) => {
      const startChunk = (index: number): Promise<ChunkResult> | null => {
        if (index >= chunks.length) return null;
        return fetchChunk(chunks[index], signal).then(
          (chunk): ChunkResult => ({ ok: true, chunk }),
          (error): ChunkResult => ({ ok: false, error }),
        );
      };

      let pending = startChunk(0);
      for (let index = 0; index < chunks.length; index += 1) {
        const current = pending;
        pending = startChunk(index + 1);
        if (!current) return;

        const result = await current;
        if (session !== sessionRef.current) return;
        if (!result.ok) throw result.error;

        setState("speaking");
        await playChunk(result.chunk, signal);
        if (session !== sessionRef.current) return;
      }
    },
    [fetchChunk, playChunk],
  );

  const speak = useCallback(
    (text: string, id: string) => {
      const chunks = chunkForSpeech(stripMarkdownForSpeech(text));
      if (!chunks.length) return;

      sessionRef.current += 1;
      const session = sessionRef.current;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setSpeakingId(id);
      setState("loading");

      // Must happen synchronously inside the click handler to unlock playback.
      const audio = getAudio();
      if (audio) {
        try {
          audio.src = SILENT_WAV;
          void audio.play().then(
            () => {
              if (session === sessionRef.current) audio.pause();
            },
            () => undefined,
          );
        } catch {
          /* the silent primer is best-effort */
        }
      }

      const useServer = engineRef.current !== "browser" && serverAvailable;
      if (!useServer) {
        speakWithBrowser(chunks, session);
        return;
      }

      runServer(chunks, session, signal).then(
        () => {
          if (session !== sessionRef.current) return;
          setState("idle");
          setSpeakingId(null);
        },
        (error: unknown) => {
          if (session !== sessionRef.current || signal.aborted) return;
          const message = error instanceof Error ? error.message : "Read aloud failed.";
          engineRef.current = "browser";
          setServerAvailable(false);
          optionsRef.current.onNotice?.(`${message} Using the on-device voice instead.`);
          speakWithBrowser(chunks, session);
        },
      );
    },
    [getAudio, runServer, serverAvailable, speakWithBrowser],
  );

  const toggle = useCallback(
    (text: string, id: string) => {
      if (speakingId === id && state !== "idle") {
        stop();
        return;
      }
      stop();
      speak(text, id);
    },
    [speak, speakingId, state, stop],
  );

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      abortRef.current?.abort();
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {
          /* not playing */
        }
      }
      if (speechSynthesisAvailable()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* nothing queued */
        }
      }
    };
  }, []);

  return {
    state,
    engine,
    speakingId,
    supported: mounted && (serverAvailable || speechSynthesisAvailable()),
    speak,
    stop,
    toggle,
  };
}

export default useReadAloud;
