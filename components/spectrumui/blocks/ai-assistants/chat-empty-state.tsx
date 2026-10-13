'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuggestedPrompt } from './types';

const KEYFRAMES = `
@keyframes su-msg-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
`;

export type ChatEmptyStateVariant = 'Default' | 'Centered';

export interface ChatEmptyStateProps {
  title?: string;
  subtitle?: string;
  prompts?: SuggestedPrompt[];
  onSelectPrompt?: (prompt: SuggestedPrompt) => void;
  variant?: ChatEmptyStateVariant;
  className?: string;
}

export function ChatEmptyState({
  title = 'What do you want to know?',
  subtitle = 'Ask a question, or start from one of these.',
  prompts = [],
  onSelectPrompt,
  variant = 'Default',
  className,
}: ChatEmptyStateProps) {
  const centered = variant === 'Centered';

  return (
    <div
      className={cn(
        'w-full max-w-[68ch]',
        centered && 'flex flex-col items-center text-center',
        className,
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="grid size-10 place-items-center rounded-xl border border-border bg-muted/40">
        <Sparkles className="size-[18px] text-muted-foreground" />
      </div>

      <h3 className="mt-5 max-w-[24ch] text-balance text-display font-bold text-foreground">
        {title}
      </h3>
      <p className="mt-3 max-w-[48ch] text-lede text-muted-foreground">
        {subtitle}
      </p>

      {prompts.length > 0 && (
        <div
          className={cn(
            'mt-5 flex flex-wrap gap-1.5',
            centered && 'justify-center',
          )}
        >
          {prompts.map((prompt, index) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => onSelectPrompt?.(prompt)}
              style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
              className={cn(
                'rounded-full border border-border bg-background px-3 py-1.5 text-label text-muted-foreground',
                'transition-[color,border-color,background-color,transform] duration-150 active:scale-[0.96]',
                'hover:border-foreground/25 hover:bg-muted/50 hover:text-foreground',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
                'motion-safe:animate-[su-msg-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]',
                'dark:bg-card dark:hover:bg-accent',
              )}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatEmptyState;
