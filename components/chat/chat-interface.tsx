"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Bot, User, Loader2, MessageSquare, Zap,
  ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { streamChat } from "@/services/chat.service";
import { conversationsService } from "@/services/conversations.service";
import { feedbackService, NEGATIVE_CATEGORIES } from "@/services/feedback.service";
import type { FeedbackRating } from "@/services/feedback.service";
import { toast } from "sonner";
import type { Project, ConversationMessage } from "@/types";
import { useAuth } from "@/lib/context/auth-context";
import { MindLogo } from "@/components/branding/mind-logo";

// ── UI message ─────────────────────────────────────────────────────────────

interface UiMessage extends ConversationMessage {
  streaming?: boolean;
  source_type?: string;
  cached?: boolean;
  response_time?: number;
  /** Real backend message ID (from SSE meta event or loaded from history). */
  backend_id?: string;
  /** Feedback already submitted for this message. */
  feedback?: FeedbackRating;
  progress_steps?: Array<{ step: string; message: string }>;
}

interface Props {
  project: Project | null;
  apiKey: string;
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function ChatInterface({ project, apiKey, conversationId, onConversationCreated }: Props) {
  const { isAdmin } = useAuth();
  const [messages, setMessages]       = useState<UiMessage[]>([]);
  const [input, setInput]             = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeConvId, setActiveConvId] = useState(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stopRef   = useRef<(() => void) | null>(null);

  // Load conversation history
  useEffect(() => {
    setActiveConvId(conversationId);
    if (isStreaming) return;
    if (!conversationId || !project) { setMessages([]); return; }
    conversationsService.messages(conversationId, apiKey).then((r) => {
      if (r.ok) {
        // For history messages, id IS the real backend message id
        setMessages(r.data.messages.map((m) => ({ ...m, backend_id: m.id }) as UiMessage));
      }
    });
  }, [conversationId, project, apiKey, isStreaming]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !project || isStreaming) return;

    let convId = activeConvId;

    // If no conversation yet, create one
    if (!convId) {
      const result = await conversationsService.create(apiKey);
      if (!result.ok) {
        toast.error("Impossible de créer une conversation");
        return;
      }
      convId = result.data.id;
      setActiveConvId(convId);
      onConversationCreated?.(convId);
    }

    const userMsg: UiMessage = {
      id:              crypto.randomUUID(),
      conversation_id: convId,
      role:            "user",
      content:         input.trim(),
      timestamp:       new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UiMessage = {
      id:              assistantId,
      conversation_id: convId,
      role:            "assistant",
      content:         "",
      timestamp:       new Date().toISOString(),
      streaming:       true,
      progress_steps:  [{ step: "init", message: "Connexion au moteur IA..." }],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    stopRef.current?.();

    const { stop } = streamChat(
      { message: userMsg.content, apiKey, conversationId: convId },
      {
        onChunk: (text) =>
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + text } : m)
          ),

        onProgress: ({ step, message }) =>
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const existing = m.progress_steps ?? [];
              const next = existing.some((s) => s.step === step)
                ? existing.map((s) => (s.step === step ? { ...s, message } : s))
                : [...existing, { step, message }];
              return { ...m, progress_steps: next };
            })
          ),

        onDone: (meta) => {
          if (meta.conversationId && !activeConvId) {
            setActiveConvId(meta.conversationId);
            onConversationCreated?.(meta.conversationId);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming:     false,
                    source_type:   meta.sourceType,
                    cached:        meta.cached,
                    response_time: meta.responseTime,
                    backend_id:    meta.messageId,
                    progress_steps: m.progress_steps ?? [],
                  }
                : m
            )
          );
          setIsStreaming(false);
          stopRef.current = null;
        },

        onError: (msg) => {
          toast.error(msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, content: m.content || "Une erreur est survenue." }
                : m
            )
          );
          setIsStreaming(false);
          stopRef.current = null;
        },
      }
    );

    stopRef.current = stop;
  };

  const stopStream = () => {
    stopRef.current?.();
    stopRef.current = null;
    setIsStreaming(false);
    setMessages((prev) => prev.map((m) => m.streaming ? { ...m, streaming: false } : m));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFeedback = async (
    localId: string,
    backendId: string,
    rating: FeedbackRating,
    comment?: string,
    categories?: string[]
  ) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => m.id === localId ? { ...m, feedback: rating } : m)
    );
    await feedbackService.create(backendId, rating, apiKey, comment, categories);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground p-8">
        <MindLogo className="size-12" />
        <p className="font-medium">Sélectionnez un projet</p>
        <p className="text-sm text-center">
          Choisissez un projet dans le panneau gauche pour démarrer une conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-64 gap-3 text-muted-foreground">
            <MessageSquare className="size-10" />
            <p className="font-medium">Posez votre première question</p>
            <p className="text-sm text-center max-w-sm">
              L&apos;IA utilisera vos fichiers indexés pour répondre avec précision.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isAdmin={isAdmin}
                onFeedback={(rating, comment, categories) => {
                  if (!msg.backend_id) return;
                  handleFeedback(msg.id, msg.backend_id, rating, comment, categories);
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background shadow-sm p-3">
            <textarea
              placeholder="Posez une question sur vos données…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 resize-none bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground min-h-6 max-h-40 disabled:opacity-50"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button size="icon" variant="destructive" className="size-8 shrink-0" onClick={stopStream}>
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : (
              <Button size="icon" className="size-8 shrink-0" onClick={sendMessage} disabled={!input.trim()}>
                <Send className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────

interface BubbleProps {
  message: UiMessage;
  isAdmin?: boolean;
  onFeedback: (rating: FeedbackRating, comment?: string, categories?: string[]) => void;
}

type ParsedTable = {
  title?: string;
  headers: string[];
  rows: string[][];
};

function stripCodeFences(content: string): string {
  const raw = content.trim();
  const fenced = raw.match(/^```(?:text|markdown)?\n([\s\S]*?)\n```$/i);
  return fenced ? fenced[1].trim() : raw;
}

function parseFlattenedPipeTable(content: string): ParsedTable | null {
  const raw = stripCodeFences(content);
  if (!raw.includes("|") || !raw.includes("Table ")) return null;

  const titleMatch = raw.match(/^(Table\s+[^|+\n]+(?:\([^)]*\))?)/i);
  const title = titleMatch?.[1]?.trim();
  const start = raw.indexOf("|");
  if (start < 0) return null;

  const payload = raw
    .slice(start)
    .replace(/(?:\+\s*){2,}/g, "||")
    .replace(/(?:-\s*){2,}/g, " ")
    .replace(/\|\s*\.\s*$/, "|");

  const segments = payload
    .split(/\|\|+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s{2,}/g, " ").trim())
    .map((s) =>
      s
        .split("|")
        .map((c) => c.trim())
        .filter((c) => !!c && !/^[-+\s]+$/.test(c))
    )
    .filter((cells) => cells.length >= 2);

  if (segments.length < 2) return null;

  const headers = segments[0];
  const rows = segments
    .slice(1)
    .map((row) => row.slice(0, headers.length))
    .filter((row) => row.length === headers.length);

  if (!rows.length) return null;
  return { title, headers, rows };
}

function parseAssistantTable(content: string): ParsedTable | null {
  const raw = stripCodeFences(content);
  if (!raw) return null;

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // ASCII table format from backend renderer
  const firstPipe = lines.findIndex((l) => l.startsWith("|"));
  if (firstPipe !== -1) {
    const titleLine = lines.find((l) => l.toLowerCase().startsWith("table "));
    const tableLines = lines.filter((l) => l.startsWith("|"));
    if (tableLines.length >= 2) {
      const toCells = (line: string) =>
        line
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);

      const headers = toCells(tableLines[0]);
      const rows = tableLines.slice(1).map(toCells).filter((r) => r.length === headers.length);
      if (headers.length >= 2 && rows.length >= 1) {
        return { title: titleLine, headers, rows };
      }
    }
  }

  const flattened = parseFlattenedPipeTable(raw);
  if (flattened) return flattened;

  // Legacy key=value | key=value single-line format
  if (raw.includes("|") && (raw.includes("=") || raw.includes(":"))) {
    const tokens = raw.split("|").map((t) => t.replace(/^[-*\s]+/, "").trim()).filter(Boolean);
    const pairs = tokens
      .map((token) => {
        const m = token.match(/^([a-zA-Z0-9_]+)\s*[:=]\s*(.*)$/);
        if (!m) return null;
        return {
          key: m[1].replace(/_/g, " "),
          value: m[2] || "-",
        };
      })
      .filter((p): p is { key: string; value: string } => !!p);

    if (pairs.length >= 3) {
      return {
        title: "Resultat",
        headers: pairs.map((p) => p.key),
        rows: [pairs.map((p) => p.value)],
      };
    }
  }

  return null;
}

function MessageBubble({ message, isAdmin, onFeedback }: BubbleProps) {
  const isUser = message.role === "user";
  const isAsciiTable = !isUser && message.content.includes("Table ") && message.content.includes("+-") && message.content.includes("| ");
  const parsedTable = !isUser ? parseAssistantTable(message.content) : null;
  const [showComment, setShowComment]   = useState(false);
  const [comment, setComment]           = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);

  const handleThumbUp = () => {
    if (message.feedback) return;
    onFeedback("positive");
    setShowComment(false);
  };

  const handleThumbDown = () => {
    if (message.feedback) return;
    setShowComment(true);
  };

  const handleSubmitNegative = async () => {
    setSubmitting(true);
    onFeedback("negative", comment.trim() || undefined, selectedCats.length ? selectedCats : undefined);
    setShowComment(false);
    setSubmitting(false);
  };

  const toggleCat = (val: string) =>
    setSelectedCats((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5 text-muted-foreground" />}
      </div>

      <div className={cn("max-w-[80%] space-y-1", isUser && "items-end flex flex-col")}>
        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {message.streaming && !message.content ? (
            <span className="flex items-center gap-1.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          ) : (
            parsedTable ? (
              <div className="space-y-1.5">
                {parsedTable.title && <p className="text-xs opacity-80">{parsedTable.title}</p>}
                <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/30">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {parsedTable.headers.map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTable.rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-border/40">
                          {row.map((cell, ci) => (
                            <td key={`${ri}-${ci}`} className="px-2 py-1.5 align-top whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isAsciiTable ? (
              <pre className="whitespace-pre overflow-x-auto text-xs leading-relaxed font-mono">{message.content}</pre>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
          )}

          {message.streaming && (message.progress_steps?.length ?? 0) > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
              {message.progress_steps?.map((s, idx) => (
                <div key={`${s.step}-${idx}`} className="text-xs opacity-90 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-current/70" />
                  <span>{s.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meta badges + feedback — assistant only, after streaming */}
        {!isUser && !message.streaming && (
          <div className="flex flex-wrap items-center gap-1 px-1">
            {isAdmin && message.source_type && (
              <Badge variant="outline" className="text-xs h-4 gap-1">
                <MindLogo className="size-3" />{message.source_type}
              </Badge>
            )}
            {isAdmin && message.cached && (
              <Badge variant="outline" className="text-xs h-4 gap-1 text-success border-success-border">
                <Zap className="size-2.5" />Cached
              </Badge>
            )}
            {isAdmin && message.response_time !== undefined && (
              <Badge variant="outline" className="text-xs h-4">
                {message.response_time.toFixed(2)}s
              </Badge>
            )}

            {/* Feedback */}
            {message.backend_id && !message.feedback && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={handleThumbUp}
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                  title="Bonne réponse"
                >
                  <ThumbsUp className="size-3" />
                </button>
                <button
                  onClick={handleThumbDown}
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Mauvaise réponse"
                >
                  <ThumbsDown className="size-3" />
                </button>
              </div>
            )}
            {message.feedback === "positive" && (
              <span className="flex items-center gap-1 text-xs text-success ml-1">
                <ThumbsUp className="size-3" />Utile
              </span>
            )}
            {message.feedback === "negative" && !showComment && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                <ThumbsDown className="size-3" />Feedback envoyé
              </span>
            )}
          </div>
        )}

        {/* Negative feedback comment panel */}
        {showComment && (
          <div className="w-full mt-1 rounded-xl border border-border bg-background p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Qu&apos;est-ce qui n&apos;allait pas ?</p>
              <button
                onClick={() => setShowComment(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5">
              {NEGATIVE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => toggleCat(cat.value)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border transition-colors",
                    selectedCats.includes(cat.value)
                      ? "bg-destructive/10 border-destructive/50 text-destructive"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Comment textarea */}
            <Textarea
              placeholder="Commentaire optionnel…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowComment(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs px-3"
                onClick={handleSubmitNegative}
                disabled={submitting}
              >
                {submitting && <Loader2 className="size-3 mr-1 animate-spin" />}
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
