"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Send, Bot, User, Loader2, Zap,
  ShieldCheck,
  ThumbsUp, ThumbsDown, X,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSearch,
  GitBranch,
  Globe2,
  Layers3,
  ShoppingBag,
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
  intent?: string;
  planned_intent?: string;
  answer_mode?: string;
  confidence_level?: string;
  cached?: boolean;
  response_time?: number;
  /** Real backend message ID (from SSE meta event or loaded from history). */
  backend_id?: string;
  /** Feedback already submitted for this message. */
  feedback?: FeedbackRating;
  progress_steps?: Array<{ step: string; message: string }>;
  trace_events?: Array<{ kind: "reasoning" | "verify"; title: string; message: string }>;
  selected_modules?: string[];
  module_results?: Array<Record<string, unknown>>;
  module_conflicts?: Array<Record<string, unknown>>;
  module_warnings?: string[];
  marketplace_plan?: Record<string, unknown>;
}

const AGENTIC_CAPABILITIES = [
  { label: "RAG vectoriel", description: "fichiers indexés", icon: FileSearch },
  { label: "SQL / DB", description: "preuves structurées", icon: Database },
  { label: "Knowledge APIs", description: "sources externes", icon: Globe2 },
  { label: "Planner", description: "orchestration", icon: GitBranch },
  { label: "Marketplace", description: "actions recommandées", icon: ShoppingBag },
];

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
    if (!isStreaming && conversationId !== activeConvId) {
      const nextConversationId = conversationId;
      const timer = window.setTimeout(() => {
        setActiveConvId(nextConversationId);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (isStreaming) return;
    if (!conversationId || !project) {
      const timer = window.setTimeout(() => {
        setMessages([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    conversationsService.messages(conversationId, apiKey).then((r) => {
      if (r.ok) {
        // For history messages, id IS the real backend message id
        setMessages(r.data.messages.map((m) => ({ ...m, backend_id: m.id }) as UiMessage));
      }
    });
  }, [conversationId, project, apiKey, isStreaming, activeConvId]);

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
      trace_events:    [],
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

        onTrace: (trace) =>
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const existing = m.trace_events ?? [];
              const next = existing.some((event) => event.kind === trace.kind && event.title === trace.title)
                ? existing.map((event) =>
                    event.kind === trace.kind && event.title === trace.title ? trace : event
                  )
                : [...existing, trace];
              return { ...m, trace_events: next };
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
                    intent:        meta.intent,
                    planned_intent: meta.plannedIntent,
                    answer_mode:   meta.answerMode,
                    confidence_level: meta.confidenceLevel,
                    cached:        meta.cached,
                    response_time: meta.responseTime,
                    backend_id:    meta.messageId,
                    selected_modules: meta.selectedModules,
                    module_results: meta.moduleResults,
                    module_conflicts: meta.moduleConflicts,
                    module_warnings: meta.moduleWarnings,
                    marketplace_plan: meta.marketplacePlan,
                    progress_steps: m.progress_steps ?? [],
                    trace_events: m.trace_events ?? [],
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
          <div className="mx-auto flex h-full min-h-[32rem] max-w-4xl flex-col justify-center gap-6 px-2 py-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-background via-muted/35 to-primary/10 p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Layers3 className="size-3.5" /> Agentique multi-module
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      Posez une question, l&apos;agent choisit les bons outils.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Le moteur orchestre recherche vectorielle, base SQL, APIs externes, mémoire de suivi,
                      validation des preuves et recommandations d&apos;actions selon votre demande.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground shadow-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <BrainCircuit className="size-4 text-primary" /> Pipeline visible
                  </div>
                  <p>Analyse → modules → preuves → réponse → actions.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {AGENTIC_CAPABILITIES.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-background/70 p-3 shadow-sm">
                    <item.icon className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
              <button type="button" onClick={() => setInput("Combien avons-nous de conversations dans la base ?")} className="rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-accent">
                <Database className="mb-2 size-4 text-primary" /> Interroger la base projet
              </button>
              <button type="button" onClick={() => setInput("Résume les fichiers indexés et propose les actions utiles.")} className="rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-accent">
                <FileSearch className="mb-2 size-4 text-primary" /> Croiser documents et actions
              </button>
              <button type="button" onClick={() => setInput("Analyse cette demande avec toutes les sources disponibles.")} className="rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-accent">
                <GitBranch className="mb-2 size-4 text-primary" /> Voir l&apos;orchestration
              </button>
            </div>
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

function parseDbTableMarker(content: string): ParsedTable | null {
  const raw = stripCodeFences(content);
  const marker = "[[DB_TABLE]]";
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;

  const payloadText = raw.slice(idx + marker.length).trim();

  // Extract first balanced JSON object after marker
  let jsonChunk = "";
  let depth = 0;
  let started = false;
  for (let i = 0; i < payloadText.length; i += 1) {
    const ch = payloadText[i];
    if (!started) {
      if (ch !== "{") continue;
      started = true;
      depth = 1;
      jsonChunk += ch;
      continue;
    }
    jsonChunk += ch;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  if (!jsonChunk) return null;
  try {
    const payload = JSON.parse(jsonChunk) as {
      table?: string;
      columns?: string[];
      rows?: Array<Record<string, unknown>>;
    };
    const columns = Array.isArray(payload.columns)
      ? payload.columns.map((c) => String(c))
      : [];
    const rowsArray = Array.isArray(payload.rows) ? payload.rows : [];
    if (columns.length < 1 || rowsArray.length < 1) return null;

    const rows = rowsArray.map((row) =>
      columns.map((col) => {
        const value = row?.[col];
        return value == null ? "-" : String(value);
      })
    );

    return {
      title: payload.table ? `Table ${payload.table}` : "Table",
      headers: columns.map((c) => c.replace(/_/g, " ")),
      rows,
    };
  } catch {
    return null;
  }
}

function removeDbTableMarker(content: string): string {
  const raw = stripCodeFences(content);
  const marker = "[[DB_TABLE]]";
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw;
  return raw.slice(0, idx).trim();
}

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

  const fromMarker = parseDbTableMarker(raw);
  if (fromMarker) return fromMarker;

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

function confidenceBadgeClass(level: string | undefined): string {
  switch (level) {
    case "high":
      return "border-success-border text-success";
    case "medium":
      return "border-warning text-warning-foreground";
    case "low":
      return "border-destructive/40 text-destructive";
    default:
      return "";
  }
}

function moduleLabel(moduleId: string): string {
  const labels: Record<string, string> = {
    vector_search: "RAG vectoriel",
    tfidf_fallback: "Recherche lexicale",
    database_search: "Base SQL",
    external_knowledge: "Knowledge API",
    marketplace_planner: "Marketplace",
  };
  return labels[moduleId] ?? moduleId.replace(/_/g, " ");
}

function ModuleIcon({ moduleId, className }: { moduleId: string; className?: string }) {
  const Icon = moduleId === "database_search"
    ? Database
    : moduleId === "external_knowledge"
      ? Globe2
      : moduleId === "marketplace_planner"
        ? ShoppingBag
        : moduleId === "vector_search" || moduleId === "tfidf_fallback"
          ? FileSearch
          : BrainCircuit;
  return <Icon className={className} />;
}

function readString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function marketplaceSummary(plan: Record<string, unknown> | undefined): string | null {
  if (!plan || plan.needed === false) return null;
  const actions = Array.isArray(plan.actions) ? plan.actions.length : 0;
  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations.length : 0;
  if (!actions && !recommendations && !plan.needed) return null;
  return `${recommendations} recommandation(s), ${actions} action(s)`;
}

function AgenticTelemetry({ message }: { message: UiMessage }) {
  const modules = message.selected_modules ?? [];
  const results = message.module_results ?? [];
  const conflicts = message.module_conflicts ?? [];
  const warnings = message.module_warnings ?? [];
  const market = marketplaceSummary(message.marketplace_plan);
  const hasTelemetry = modules.length > 0 || results.length > 0 || conflicts.length > 0 || warnings.length > 0 || !!market;

  if (!hasTelemetry) return null;

  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-background/35 p-3 text-xs">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Layers3 className="size-3.5 text-primary" /> Orchestration multi-module
        </span>
        {message.planned_intent && (
          <Badge variant="outline" className="h-5 text-[10px]">intent {message.planned_intent}</Badge>
        )}
        {message.source_type && (
          <Badge variant="secondary" className="h-5 text-[10px]">source {message.source_type}</Badge>
        )}
      </div>

      {modules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {modules.map((moduleId) => (
            <Badge key={moduleId} variant="outline" className="h-6 gap-1.5 rounded-full bg-background/60 text-[11px]">
              <ModuleIcon moduleId={moduleId} className="size-3" /> {moduleLabel(moduleId)}
            </Badge>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {results.slice(0, 4).map((result, idx) => {
            const id = readString(result, ["module_id", "module", "source", "id"]) ?? `module-${idx + 1}`;
            const status = readString(result, ["status", "state"]) ?? "ok";
            const count = readNumber(result, ["count", "contexts", "results_count", "items"]);
            return (
              <div key={`${id}-${idx}`} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/45 px-2.5 py-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <ModuleIcon moduleId={id} className="size-3.5 text-primary" />
                  <span className="truncate">{moduleLabel(id)}</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="size-3 text-success" /> {count ?? status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(warnings.length > 0 || conflicts.length > 0 || market) && (
        <div className="mt-2 space-y-1.5">
          {warnings.slice(0, 2).map((warning, idx) => (
            <div key={`${warning}-${idx}`} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> <span>{warning}</span>
            </div>
          ))}
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-2.5 py-2 text-destructive">
              <AlertTriangle className="size-3.5" /> {conflicts.length} conflit(s) de sources détecté(s)
            </div>
          )}
          {market && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-2 text-primary">
              <ShoppingBag className="size-3.5" /> Marketplace activé : {market}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgenticThinking({ steps, compact = false }: { steps: UiMessage["progress_steps"]; compact?: boolean }) {
  const activeSteps = steps?.length ? steps.slice(-4) : [{ step: "init", message: "Initialisation du graphe agentique..." }];
  const latest = activeSteps[activeSteps.length - 1]?.message ?? "Orchestration en cours...";
  const agents = [
    { label: "Planner", icon: GitBranch, delay: "0ms" },
    { label: "RAG", icon: FileSearch, delay: "180ms" },
    { label: "SQL", icon: Database, delay: "360ms" },
    { label: "Synthèse", icon: BrainCircuit, delay: "540ms" },
  ];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background/70 to-info/10 shadow-sm",
      compact ? "mt-2 p-2.5" : "min-w-[270px] p-3"
    )}>
      <div className="pointer-events-none absolute -left-8 -top-8 size-28 rounded-full bg-primary/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 right-4 size-24 rounded-full bg-info/15 blur-2xl" />
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full border border-primary/20 animate-ping" />

      <div className="relative flex items-center gap-3">
        <div className="relative flex size-12 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/30" />
          <div className="absolute inset-1 rounded-full border border-dashed border-primary/45 animate-spin [animation-duration:3.8s]" />
          <div className="absolute inset-3 rounded-full bg-primary/20 blur-sm animate-pulse" />
          <BrainCircuit className="relative size-5 text-primary" />
          {["left-0 top-2", "right-0 top-1", "bottom-1 left-2", "bottom-2 right-1"].map((pos, idx) => (
            <span
              key={pos}
              className={cn("absolute size-1.5 rounded-full bg-primary text-primary shadow-[0_0_10px_currentColor] animate-pulse", pos)}
              style={{ animationDelay: `${idx * 160}ms` }}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="h-5 gap-1 rounded-full border border-primary/20 bg-primary/10 text-[10px] text-primary">
              <Zap className="size-2.5" /> Mode agentique
            </Badge>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">multi-agents</span>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-foreground">{latest}</p>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-4 gap-1.5">
        {agents.map(({ label, icon: Icon, delay }) => (
          <div key={label} className="rounded-xl border border-border/35 bg-background/45 px-2 py-2 text-center backdrop-blur">
            <Icon className="mx-auto size-3.5 text-primary animate-pulse" style={{ animationDelay: delay }} />
            <div className="mt-1 truncate text-[10px] font-medium text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-3 space-y-1.5">
        {activeSteps.map((s, idx) => {
          const isLast = idx === activeSteps.length - 1;
          return (
            <div key={`${s.step}-${idx}`} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className={cn(
                "size-1.5 rounded-full",
                isLast ? "bg-primary text-primary shadow-[0_0_10px_currentColor] animate-pulse" : "bg-success"
              )} />
              <span className={cn("truncate", isLast && "font-medium text-foreground")}>{s.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ message, isAdmin, onFeedback }: BubbleProps) {
  const isUser = message.role === "user";
  const cleanedContent = isUser ? message.content : removeDbTableMarker(message.content);
  const isAsciiTable = !isUser && cleanedContent.includes("Table ") && cleanedContent.includes("+-") && cleanedContent.includes("| ");
  const parsedTable = !isUser ? parseAssistantTable(message.content) : null;
  const [showComment, setShowComment]   = useState(false);
  const [comment, setComment]           = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [traceOpen, setTraceOpen]       = useState(false);

  const reasoningCount = message.trace_events?.filter((event) => event.kind === "reasoning").length ?? 0;
  const verifyCount = message.trace_events?.filter((event) => event.kind === "verify").length ?? 0;

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
            <AgenticThinking steps={message.progress_steps} />
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
              <pre className="whitespace-pre overflow-x-auto text-xs leading-relaxed font-mono">{cleanedContent}</pre>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{cleanedContent}</p>
            )
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
          )}

          {message.streaming && message.content && (message.progress_steps?.length ?? 0) > 0 && (
            <AgenticThinking steps={message.progress_steps} compact />
          )}

          {!isUser && <AgenticTelemetry message={message} />}

          {!isUser && isAdmin && (message.trace_events?.length ?? 0) > 0 && (
            <div className="mt-2 border-t border-border/40 pt-2">
              <button
                type="button"
                onClick={() => setTraceOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-background/20 px-2.5 py-2 text-left text-xs transition-colors hover:bg-background/30"
              >
                <div className="flex items-center gap-2">
                  <BrainCircuit className="size-3.5 opacity-80" />
                  <span className="font-medium">Trace agentique</span>
                  <Badge variant="outline" className="h-4 text-[10px]">
                    {message.trace_events?.length} événement(s)
                  </Badge>
                  {reasoningCount > 0 && (
                    <Badge variant="secondary" className="h-4 gap-1 text-[10px]">
                      <BrainCircuit className="size-2.5" />{reasoningCount}
                    </Badge>
                  )}
                  {verifyCount > 0 && (
                    <Badge variant="secondary" className="h-4 gap-1 text-[10px]">
                      <ShieldCheck className="size-2.5" />{verifyCount}
                    </Badge>
                  )}
                </div>
                {traceOpen ? <ChevronDown className="size-3.5 opacity-70" /> : <ChevronRight className="size-3.5 opacity-70" />}
              </button>

              {traceOpen && (
                <div className="mt-2 space-y-1.5">
                  {message.trace_events?.map((event, idx) => (
                    <div
                      key={`${event.kind}-${event.title}-${idx}`}
                      className="rounded-md border border-border/40 bg-background/30 px-2.5 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 font-medium opacity-80">
                        {event.kind === "reasoning" ? (
                          <BrainCircuit className="size-3.5" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                        <span>{event.title}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap pl-5 opacity-90">{event.message}</div>
                    </div>
                  ))}
                </div>
              )}
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
            {isAdmin && message.planned_intent && (
              <Badge variant="outline" className="text-xs h-4">
                intent {message.planned_intent}
              </Badge>
            )}
            {isAdmin && message.answer_mode && (
              <Badge variant="outline" className="text-xs h-4">
                mode {message.answer_mode}
              </Badge>
            )}
            {isAdmin && message.confidence_level && (
              <Badge
                variant="outline"
                className={cn("text-xs h-4", confidenceBadgeClass(message.confidence_level))}
              >
                conf {message.confidence_level}
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
