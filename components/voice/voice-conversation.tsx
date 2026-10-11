"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, Headphones, Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type RecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function messageText(message: { parts?: Array<{ type?: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function speechFriendlyText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[([a-z]{1,2}\d{1,3})\]/gi, " source $1 ")
    .replace(/#{1,6}\s/g, "")
    .replace(/[>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function VoiceConversation() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  useEffect(() => {
    const readModel = () => setSelectedModelId(window.localStorage.getItem("law-model-id"));
    readModel();
    window.addEventListener("law-model-change", readModel);
    return () => window.removeEventListener("law-model-change", readModel);
  }, []);
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: selectedModelId ? { model: selectedModelId } : {},
    }),
    [selectedModelId],
  );
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [speechRate, setSpeechRate] = useState<number | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const recordingStartedAtRef = useRef(0);
  const spokenMessageRef = useRef<string | null>(null);
  const busy = status === "submitted" || status === "streaming";
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const lastAssistantText = lastAssistant ? messageText(lastAssistant) : "";

  const stopReading = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const submitText = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    stopReading();
    setVoiceError("");
    setDraft("");
    setTranscriptPreview("");
    await sendMessage({ text: clean });
  }, [busy, sendMessage, stopReading]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Voice input is not supported by this browser. You can type your question below or use a supported browser.");
      return;
    }
    stopReading();
    setVoiceError("");
    finalTranscriptRef.current = "";
    setTranscriptPreview("");
    recordingStartedAtRef.current = Date.now();

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result[0]?.transcript ?? "";
        if (result.isFinal) finalTranscriptRef.current += phrase + " ";
        else interim += phrase;
      }
      setTranscriptPreview((finalTranscriptRef.current + interim).trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError("Voice input stopped. Check microphone permission and try again.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const transcript = finalTranscriptRef.current.trim();
      if (!transcript) {
        setTranscriptPreview("");
        return;
      }
      const seconds = Math.max((Date.now() - recordingStartedAtRef.current) / 1000, 1);
      const words = transcript.split(/\s+/).filter(Boolean).length;
      setSpeechRate(Math.round((words / seconds) * 60));
      setDraft(transcript);
      setTranscriptPreview("");
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setVoiceError("The microphone could not start. Please try again.");
    }
  }, [stopReading]);

  useEffect(() => {
    if (!autoRead || status !== "ready" || !lastAssistant || !lastAssistantText) return;
    if (spokenMessageRef.current === lastAssistant.id) return;
    if (!("speechSynthesis" in window)) return;
    spokenMessageRef.current = lastAssistant.id;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechFriendlyText(lastAssistantText));
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [autoRead, lastAssistant, lastAssistantText, status]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitText(draft);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Return to legal research chat" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">CALEGINFO Voice</h1>
          <p className="text-sm text-muted-foreground">Speak naturally. Get researched answers about California law.</p>
        </div>
        <button
          type="button"
          onClick={() => setAutoRead((value) => !value)}
          aria-pressed={autoRead}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {autoRead ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{autoRead ? "Read answers aloud" : "Read aloud off"}</span>
          <span className="sm:hidden">{autoRead ? "Audio on" : "Audio off"}</span>
        </button>
      </header>

      <section aria-label="Voice conversation" aria-live="polite" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Headphones className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-medium">Ask a legal question out loud</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Press Start speaking, ask your question, then pause. Your recognized words appear before you send them, so you can review or edit the transcript.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {listening ? (
              <button type="button" onClick={stopListening} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-destructive px-4 font-medium text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Square className="size-4" aria-hidden="true" /> Stop listening
              </button>
            ) : (
              <button type="button" onClick={startListening} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Mic className="size-4" aria-hidden="true" /> Start speaking
              </button>
            )}
            {busy && (
              <button type="button" onClick={() => { stop(); stopReading(); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Square className="size-4" aria-hidden="true" /> Stop answer
              </button>
            )}
            <button type="button" onClick={stopReading} className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <VolumeX className="size-4" aria-hidden="true" /> Stop reading
            </button>
          </div>
          {listening && <p className="mt-3 text-sm font-medium" role="status"><span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-destructive" />Listening. Pause when you have finished speaking.</p>}
          {transcriptPreview && <p className="mt-3 rounded-lg bg-muted p-3 text-sm" aria-live="polite">Hearing: {transcriptPreview}</p>}
          {speechRate !== null && <p className="mt-3 text-xs text-muted-foreground">Approximate speaking pace for your last turn: {speechRate} words/minute. This is a timing estimate, not an emotion or intent assessment.</p>}
        </div>

        {voiceError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{voiceError}</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">The legal research request failed. Please try again. {error.message}</p>}

        <div className="flex flex-col gap-4" aria-label="Conversation transcript">
          {messages.map((message) => {
            const text = messageText(message);
            if (!text) return null;
            const isUser = message.role === "user";
            return (
              <article key={message.id} className={`rounded-xl border p-4 sm:p-5 ${isUser ? "ml-5 bg-muted/60 sm:ml-16" : "mr-2 bg-card sm:mr-8"}`}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isUser ? "You asked" : "CALEGINFO"}</h3>
                <div className="whitespace-pre-wrap break-words text-base leading-7">{text}</div>
                {!isUser && (
                  <button type="button" onClick={() => {
                    if (!("speechSynthesis" in window)) return;
                    stopReading();
                    const utterance = new SpeechSynthesisUtterance(speechFriendlyText(text));
                    window.speechSynthesis.speak(utterance);
                  }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Volume2 className="size-4" aria-hidden="true" /> Read this answer
                  </button>
                )}
              </article>
            );
          })}
          {busy && <p role="status" className="text-sm text-muted-foreground">Researching California law and preparing an answer…</p>}
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-base font-medium">Your conversation will appear here.</p>
              <p className="mt-2 text-sm text-muted-foreground">You can also type a question below and have the answer read aloud.</p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="sticky bottom-0 mt-auto flex gap-2 border-t bg-background py-3">
          <label htmlFor="voice-question" className="sr-only">Legal question or reviewed speech transcript</label>
          <textarea
            id="voice-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type or review your question here…"
            rows={2}
            className="min-h-12 min-w-0 flex-1 resize-y rounded-xl border bg-card px-3 py-3 text-base leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" disabled={!draft.trim() || busy} className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 self-end rounded-xl bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Send legal question">
            <Send className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-xs leading-5 text-muted-foreground">
          Voice input depends on browser support and microphone permission. Speech recognition may be processed by your browser provider. CALEGINFO does not save a microphone recording through this page. Spoken answers use your device’s available speech synthesis; you can turn audio off at any time.
        </p>
      </section>
    </main>
  );
}
