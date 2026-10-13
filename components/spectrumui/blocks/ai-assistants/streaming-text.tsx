'use client';

import { CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseAnswerBlocks, tokenizeInline } from './answer-blocks';
import type { Citation, SuggestedPrompt } from './types';

const KEYFRAMES = `
@keyframes su-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
@keyframes su-msg-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
`;

export type StreamingTextVariant = 'Answer' | 'Sources';

export interface StreamingTextProps {
  text: string;
  streaming?: boolean;
  citations?: Citation[];
  followUps?: SuggestedPrompt[];
  onFollowUp?: (prompt: SuggestedPrompt) => void;
  variant?: StreamingTextVariant;
  className?: string;
}

/**
 * Where an authority points, and what to print for it. Internal deep-links
 * (`/codes?code=PEN&section=459`, the Judicial Council PDFs are absolute) are
 * labelled by destination rather than by the host the reader happens to be on,
 * and a citation with no URL gets no label at all instead of being stamped
 * with the app's own hostname.
 */
function citationLink(url?: string): { href: string; label: string; external: boolean } | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    let label = raw;
    try {
      label = new URL(raw).hostname.replace(/^www\./, '');
    } catch {
      /* keep the raw URL as the label */
    }
    return { href: raw, label, external: true };
  }
  if (raw.startsWith('/')) return { href: raw, label: 'Open in library', external: false };
  return null;
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-[su-caret_1s_steps(1,end)_infinite] bg-current motion-reduce:animate-none"
    />
  );
}

function CitationChip({ marker }: { marker: string }) {
  return (
    <sup className="ml-0.5 inline-grid size-[15px] place-items-center rounded bg-black/[0.07] align-super font-mono text-[9.5px] font-semibold text-neutral-600 dark:bg-white/[0.1] dark:text-neutral-300">
      {marker}
    </sup>
  );
}

function Inline({ text, caret }: { text: string; caret?: boolean }) {
  return (
    <>
      {tokenizeInline(text).map((token, index) => {
        if (token.type === 'strong') {
          return (
            <strong key={index} className="font-semibold text-neutral-900 dark:text-neutral-50">
              {token.value}
            </strong>
          );
        }
        if (token.type === 'code') {
          return (
            <code
              key={index}
              className="rounded bg-black/[0.05] px-1 py-px font-mono text-[0.88em] text-neutral-800 dark:bg-white/[0.08] dark:text-neutral-200"
            >
              {token.value}
            </code>
          );
        }
        if (token.type === 'cite') return <CitationChip key={index} marker={token.value} />;
        if (token.type === 'link') {
          return (
            <a
              key={index}
              href={token.value}
              target="_blank"
              rel="noreferrer"
              className="break-all underline underline-offset-2 decoration-neutral-400/70 hover:decoration-current"
            >
              {token.value}
            </a>
          );
        }
        return <span key={index}>{token.value}</span>;
      })}
      {caret && <Caret />}
    </>
  );
}

function CitationRow({ citation }: { citation: Citation }) {
  const link = citationLink(citation.url);

  const body = (
    <>
      <span className="grid size-[16px] shrink-0 translate-y-0.5 place-items-center rounded bg-black/[0.06] font-mono text-[9.5px] font-semibold text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300">
        {citation.index}
      </span>
      <span className="min-w-0">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">{citation.title}</span>
        {link && (
          <span className="ml-1.5 font-mono text-[10.5px] text-neutral-400 dark:text-neutral-600">
            {link.label}
          </span>
        )}
      </span>
    </>
  );

  if (!link) return <span className="flex items-baseline gap-2">{body}</span>;

  return (
    <a
      href={link.href}
      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
      title={link.external ? `Open ${link.href}` : 'Open in the library'}
      className="flex items-baseline gap-2 rounded-md transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
    >
      {body}
    </a>
  );
}

export function StreamingText({
  text,
  streaming = false,
  citations = [],
  followUps = [],
  onFollowUp,
  variant = 'Answer',
  className,
}: StreamingTextProps) {
  const blocks = parseAnswerBlocks(text);
  const caretOnLastBlock = streaming && blocks.length > 0;

  return (
    <div className={cn('w-full max-w-[68ch] text-[15px]', className)}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div
        aria-hidden={streaming || undefined}
        className="space-y-3.5 leading-[1.7] text-neutral-700 dark:text-neutral-300"
      >
        {blocks.length === 0 && streaming && (
          <p>
            <Caret />
          </p>
        )}

        {blocks.map((block, index) => {
          const caret = caretOnLastBlock && index === blocks.length - 1;

          if (block.kind === 'heading') {
            return (
              <h3
                key={index}
                className={cn(
                  'font-semibold text-neutral-900 dark:text-neutral-50',
                  block.level <= 2 ? 'text-[17px] leading-snug' : 'text-[15px] leading-snug',
                )}
              >
                <Inline text={block.text} caret={caret} />
              </h3>
            );
          }

          if (block.kind === 'list') {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List
                key={index}
                className={cn(
                  'space-y-1.5 pl-5 marker:text-neutral-400 dark:marker:text-neutral-600',
                  block.ordered ? 'list-decimal' : 'list-disc',
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} caret={caret && itemIndex === block.items.length - 1} />
                  </li>
                ))}
              </List>
            );
          }

          return (
            <p key={index}>
              <Inline text={block.text} caret={caret} />
            </p>
          );
        })}
      </div>

      {!streaming && citations.length > 0 && (
        <div className="mt-4 motion-safe:animate-[su-msg-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]">
          {variant === 'Sources' ? (
            <ul className="space-y-1.5">
              {citations.map((citation) => (
                <li key={citation.id} className="text-[13px] leading-[1.55]">
                  <CitationRow citation={citation} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2">
              <span aria-hidden className="flex -space-x-1">
                {citations.slice(0, 3).map((citation) => (
                  <span
                    key={citation.id}
                    className="grid size-4 place-items-center rounded-full border border-white bg-neutral-200 font-mono text-[8px] font-semibold text-neutral-600 dark:border-[#0B0B0D] dark:bg-neutral-700 dark:text-neutral-200"
                  >
                    {citation.index}
                  </span>
                ))}
              </span>
              <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                {citations.length} source{citations.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}

      {!streaming && followUps.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
            Follow-ups
          </p>
          <ul>
            {followUps.map((prompt, index) => (
              <li
                key={prompt.id}
                className="motion-safe:animate-[su-msg-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]"
                style={{ animationDelay: `${Math.min(index, 4) * 50}ms` }}
              >
                <button
                  type="button"
                  onClick={() => onFollowUp?.(prompt)}
                  className="group flex w-full items-center gap-2 border-b border-black/[0.05] py-2 text-left text-[13px] text-neutral-600 transition-[color,transform] duration-150 last:border-b-0 hover:text-neutral-900 active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-white/[0.06] dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  <CornerDownLeft className="size-3 text-neutral-300 transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
                  {prompt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StreamingText;
