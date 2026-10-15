import { AIChatCard } from "@/components/spectrumui/ai-chat-card";

const PROMPTS = [
  "What is the statute of limitations for personal injury in California?",
  "When can a landlord enter a rental unit in California?",
  "What are the elements of burglary in California?",
  "What are the exceptions to at-will employment in California?",
];

export default function Page() {
  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden">
      <AIChatCard
        title="California law, answered."
        subtitle="The complete California Codes, 2025-26 bills, Rules of Court, and case law — cited inline."
        greeting=""
        prompt="Ask anything about California law, or press send to start."
        prompt="Ask anything about California law, or press send to start."
        prompts={PROMPTS}
        placeholder="Ask anything about California law…"
      />
    </main>
  );
}
