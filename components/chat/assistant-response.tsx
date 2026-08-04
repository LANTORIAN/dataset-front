import { Children, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { PublicChatSourceV2 } from "@/types";

interface AssistantResponseProps {
  content: string;
  sources?: PublicChatSourceV2[];
}

function normalizeAssistantMarkdown(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*\*\*([^*\n]{1,80}?)\*\*\s*$/gm, (_, rawTitle: string) => {
      const title = rawTitle.trim().replace(/\s*:\s*$/, "");
      return `### ${title}`;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderCitationText(
  children: ReactNode,
  sourceLabels: Map<string, string>
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child;

    const parts = child.split(/(\[\d+\])/g);
    if (parts.length === 1) return child;

    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (!match) return part;

      const citationId = match[1];
      const sourceLabel = sourceLabels.get(citationId);
      return (
        <sup
          key={`${citationId}-${index}`}
          title={sourceLabel ?? `Source ${citationId}`}
          aria-label={sourceLabel ? `Source ${citationId} : ${sourceLabel}` : `Source ${citationId}`}
          className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-1 py-0.5 align-super text-[10px] font-semibold leading-none text-primary"
        >
          {citationId}
        </sup>
      );
    });
  });
}

export function AssistantResponse({ content, sources = [] }: AssistantResponseProps) {
  const markdown = normalizeAssistantMarkdown(content);
  const sourceLabels = new Map(sources.map((source) => [source.citation_id, source.label]));

  if (!markdown) return null;

  return (
    <div className="min-w-0 max-w-prose text-sm leading-7 text-foreground/90 sm:text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground first:mt-0">
              {renderCitationText(children, sourceLabels)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-lg font-semibold tracking-tight text-foreground first:mt-0">
              {renderCitationText(children, sourceLabels)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2.5 mt-6 border-t border-border/60 pt-5 text-sm font-semibold uppercase tracking-[0.08em] text-foreground first:mt-0 first:border-t-0 first:pt-0">
              {renderCitationText(children, sourceLabels)}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 first:mt-0 last:mb-0">
              {renderCitationText(children, sourceLabels)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {renderCitationText(children, sourceLabels)}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-primary">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 leading-7">{renderCitationText(children, sourceLabels)}</li>
          ),
          a: ({ href, children }) => {
            const external = !!href && !href.startsWith("/") && !href.startsWith("#");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="inline-flex items-baseline gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{children}</span>
                {external && <ExternalLink className="size-3 shrink-0 self-center" aria-hidden="true" />}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-primary/50 bg-primary/5 py-2 pl-4 pr-3 text-foreground/80">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border/70" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[32rem] border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/70 text-foreground">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border/70 px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/40 px-3 py-2 align-top text-muted-foreground">
              {renderCitationText(children, sourceLabels)}
            </td>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-xl border border-border/70 bg-foreground/[0.04] p-3 font-mono text-xs leading-6">
              {children}
            </pre>
          ),
          code: ({ className, children }) => (
            <code className={`${className ?? ""} rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[0.9em]`}>
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
