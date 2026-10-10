import type { BaseSuggestionIconId } from "@/lib/base/preview-schema";

export type BaseSuggestionOption = {
  label: string;
  prompt: string;
};

export type BaseSuggestionGroup = {
  label: string;
  icon: BaseSuggestionIconId;
  options: BaseSuggestionOption[];
};

export type BaseSlashCommand = {
  id: string;
  description: string;
  icon: string;
};

export type BaseBrandTheme = {
  background: string;
  text: string;
  surface: string;
  accent: string;
};

export type ResolvedBaseConfig = {
  assistant: {
    appName: string;
    labels: {
      newChat: string;
      newThread: string;
      composerPlaceholder: string;
    };
    welcome: {
      headline: string;
      body?: string | null;
    };
    suggestionGroups: BaseSuggestionGroup[];
    slashCommands: BaseSlashCommand[];
  };
  brandTheme: BaseBrandTheme;
};

export const defaultBaseConfig: ResolvedBaseConfig = {
  assistant: {
    appName: "LegInfo",
    labels: {
      newChat: "New chat",
      newThread: "New thread",
      composerPlaceholder: "Ask anything about California law…",
    },
    welcome: {
      headline: "California law, answered.",
      body: "The complete California Codes, 2025-26 bills, Rules of Court, all 1,670 Judicial Council forms, and case law — cited inline.",
    },
    suggestionGroups: [
      {
        label: "Statutes",
        icon: "search",
        options: [
          { label: "Burglary vs. robbery", prompt: "What is the difference between burglary and robbery in California?" },
          { label: "PI statute of limitations", prompt: "What is the statute of limitations for personal injury in California?" },
          { label: "Landlord entry rules", prompt: "When can a landlord enter a rental unit in California?" },
        ],
      },
      {
        label: "Forms",
        icon: "document",
        options: [
          { label: "DV restraining order forms", prompt: "Which Judicial Council forms do I need to file for a domestic violence restraining order in California, and which are mandatory?" },
          { label: "Eviction (unlawful detainer)", prompt: "Which Judicial Council forms are required to file an unlawful detainer eviction case in California?" },
          { label: "Fee waiver", prompt: "Which form do I file to ask a California court to waive filing fees, and what is it called?" },
        ],
      },
      {
        label: "Case law",
        icon: "document",
        options: [
          { label: "Coercive control cases", prompt: "How have California courts interpreted coercive control under the Domestic Violence Prevention Act?" },
          { label: "Burglary tools rule", prompt: "How do California courts apply the burglary tools statute in California?" },
          { label: "Continuances", prompt: "What do the California Rules of Court say about continuances in civil trials?" },
        ],
      },
      {
        label: "Research",
        icon: "analyze",
        options: [
          { label: "At-will exceptions", prompt: "What are the exceptions to at-will employment in California?" },
          { label: "2025-26 wildfire bills", prompt: "What wildfire-related bills did the Legislature pass in the 2025-26 session?" },
          { label: "Continuance rules", prompt: "What do the California Rules of Court say about continuances in civil trials?" },
        ],
      },
    ],
    slashCommands: [],
  },
  brandTheme: {
    background: "#ffffff",
    text: "#0a0a0a",
    surface: "#f4f4f5",
    accent: "#4c8dff",
  },
};
