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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  confirmPublicChatAction,
  streamChat,
} from "@/services/chat.service";
import type { ClarificationResponsePayload } from "@/services/chat.service";
import { conversationsService } from "@/services/conversations.service";
import { feedbackService, NEGATIVE_CATEGORIES } from "@/services/feedback.service";
import type { FeedbackRating } from "@/services/feedback.service";
import { toast } from "sonner";
import type {
  Project,
  ConversationMessage,
  NLUResult,
  RecoveryMetadata,
  PublicChatActionV2,
  PublicChatClarificationV2,
  PublicChatResponseV2,
} from "@/types";
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
  nlu?: NLUResult;
  cached?: boolean;
  response_time?: number;
  /** Real backend message ID (from SSE meta event or loaded from history). */
  backend_id?: string;
  /** Feedback already submitted for this message. */
  feedback?: FeedbackRating;
  progress_steps?: ProgressStep[];
  trace_events?: Array<{ kind: "reasoning" | "verify"; title: string; message: string }>;
  selected_modules?: string[];
  module_results?: Array<Record<string, unknown>>;
  module_conflicts?: Array<Record<string, unknown>>;
  module_warnings?: string[];
  marketplace_plan?: Record<string, unknown>;
  recovery_used?: boolean;
  recovery_reason?: string;
  recovery_actions?: string[];
  public_response?: PublicChatResponseV2;
}

function mergeConversationMessages(
  history: ConversationMessage[],
  current: UiMessage[],
  conversationId: string
): UiMessage[] {
  const currentConversation = current.filter(
    (message) => message.conversation_id === conversationId
  );
  const currentByBackendId = new Map(
    currentConversation.map((message) => [message.backend_id ?? message.id, message])
  );
  const seen = new Set<string>();
  const merged = history.map((message) => {
    seen.add(message.id);
    const existing = currentByBackendId.get(message.id);
    const historyWithPublic = message as ConversationMessage & {
      public_response?: PublicChatResponseV2 | null;
    };
    return existing
      ? ({
          ...message,
          ...existing,
          public_response: Object.prototype.hasOwnProperty.call(
            historyWithPublic,
            "public_response"
          )
            ? historyWithPublic.public_response ?? undefined
            : existing.public_response,
          backend_id: message.id,
          streaming: false,
        } as UiMessage)
      : ({ ...message, backend_id: message.id } as UiMessage);
  });
  for (const message of currentConversation) {
    const backendId = message.backend_id ?? message.id;
    if (!seen.has(backendId)) merged.push(message);
  }
  return merged;
}

type ProgressStep = { step: string; message: string };

const MAX_PROGRESS_STEPS = 14;

const AGENTIC_CAPABILITIES = [
  { label: "RAG vectoriel", description: "fichiers indexés", icon: FileSearch },
  { label: "SQL / DB", description: "preuves structurées", icon: Database },
  { label: "Knowledge APIs", description: "sources externes", icon: Globe2 },
  { label: "Planner", description: "orchestration", icon: GitBranch },
  { label: "Marketplace", description: "actions recommandées", icon: ShoppingBag },
];

const THINKING_STAGES = [
  { title: "Compréhension", short: "Route", icon: BrainCircuit },
  { title: "Choix des sources", short: "Sources", icon: GitBranch },
  { title: "Consultation", short: "Recherche", icon: FileSearch },
  { title: "Sélection des preuves", short: "Preuve", icon: ShieldCheck },
  { title: "Réponse", short: "Réponse", icon: CheckCircle2 },
];

const STEP_STAGE_INDEX: Record<string, number> = {
  init: 0,
  route: 0,
  history: 0,
  sources: 1,
  rag: 2,
  vector: 2,
  vector_search: 2,
  knowledge: 2,
  tfidf: 2,
  tfidf_fallback: 2,
  db: 2,
  database_search: 2,
  external: 2,
  external_search: 2,
  select: 3,
  verify: 3,
  db_answer: 4,
  action: 4,
  faq: 4,
  recover: 4,
  answer: 4,
};

const STEP_ICONS: Record<string, typeof BrainCircuit> = {
  init: BrainCircuit,
  route: GitBranch,
  history: Layers3,
  sources: GitBranch,
  rag: FileSearch,
  vector: FileSearch,
  vector_search: FileSearch,
  knowledge: FileSearch,
  tfidf: FileSearch,
  tfidf_fallback: FileSearch,
  db: Database,
  database_search: Database,
  external: Globe2,
  external_search: Globe2,
  select: ShieldCheck,
  verify: ShieldCheck,
  db_answer: Database,
  action: ShoppingBag,
  faq: FileSearch,
  recover: AlertTriangle,
  answer: CheckCircle2,
};

function normalizeProgressStep(step: string | undefined): string {
  return (step || "progress").trim().toLowerCase();
}

function progressStageIndex(step: string | undefined, fallbackIndex: number): number {
  const key = normalizeProgressStep(step);
  return STEP_STAGE_INDEX[key] ?? Math.min(Math.max(fallbackIndex, 0), THINKING_STAGES.length - 1);
}

function isWarningProgressStep(step: string | undefined): boolean {
  return normalizeProgressStep(step) === "recover";
}

function ProgressStepIcon({ step, className }: { step?: string; className?: string }) {
  const key = normalizeProgressStep(step);
  if (STEP_ICONS[key] === GitBranch) return <GitBranch className={className} />;
  if (STEP_ICONS[key] === Layers3) return <Layers3 className={className} />;
  if (STEP_ICONS[key] === FileSearch) return <FileSearch className={className} />;
  if (STEP_ICONS[key] === Database) return <Database className={className} />;
  if (STEP_ICONS[key] === Globe2) return <Globe2 className={className} />;
  if (STEP_ICONS[key] === ShieldCheck) return <ShieldCheck className={className} />;
  if (STEP_ICONS[key] === ShoppingBag) return <ShoppingBag className={className} />;
  if (STEP_ICONS[key] === AlertTriangle) return <AlertTriangle className={className} />;
  if (STEP_ICONS[key] === CheckCircle2) return <CheckCircle2 className={className} />;

  const stageIndex = progressStageIndex(key, 0);
  if (stageIndex === 1) return <GitBranch className={className} />;
  if (stageIndex === 2) return <FileSearch className={className} />;
  if (stageIndex === 3) return <ShieldCheck className={className} />;
  if (stageIndex === 4) return <CheckCircle2 className={className} />;
  return <BrainCircuit className={className} />;
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
  const sendingRef = useRef(false);
  const historyLoadRef = useRef(0);

  // Load conversation history
  useEffect(() => {
    const loadVersion = ++historyLoadRef.current;
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
        if (historyLoadRef.current === loadVersion) setMessages([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!apiKey) return;
    conversationsService.messages(conversationId, apiKey).then((r) => {
      if (r.ok && historyLoadRef.current === loadVersion) {
        setMessages((current) =>
          mergeConversationMessages(r.data.messages, current, conversationId)
        );
      }
    });
    return () => {
      if (historyLoadRef.current === loadVersion) historyLoadRef.current += 1;
    };
  }, [conversationId, project, apiKey, isStreaming, activeConvId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (turn?: {
    content: string;
    clarificationResponse: ClarificationResponsePayload;
  }) => {
    const content = turn?.content.trim() ?? input.trim();
    if (!content || !project || !apiKey || isStreaming || sendingRef.current) {
      return false;
    }
    sendingRef.current = true;

    let convId = activeConvId;

    // If no conversation yet, create one
    if (!convId) {
      const result = await conversationsService.create(apiKey);
      if (!result.ok) {
        sendingRef.current = false;
        toast.error("Impossible de créer une conversation");
        return false;
      }
      convId = result.data.id;
      setActiveConvId(convId);
      onConversationCreated?.(convId);
    }

    const userMsg: UiMessage = {
      id:              crypto.randomUUID(),
      conversation_id: convId,
      role:            "user",
      content,
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
    if (!turn) setInput("");
    setIsStreaming(true);
    stopRef.current?.();

    const { stop, completion } = streamChat(
      {
        message: userMsg.content,
        apiKey,
        conversationId: convId,
        requestId: userMsg.id,
        clarificationResponse: turn?.clarificationResponse,
      },
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
              const alreadyLogged = existing.some(
                (s) => s.step === step && s.message === message
              );
              const next = alreadyLogged
                ? existing
                : [...existing, { step, message }].slice(-MAX_PROGRESS_STEPS);
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
                    nlu:          meta.nlu,
                    cached:        meta.cached,
                    response_time: meta.responseTime,
                    backend_id:    meta.messageId,
                    selected_modules: meta.selectedModules,
                    module_results: meta.moduleResults,
                    module_conflicts: meta.moduleConflicts,
                    module_warnings: meta.moduleWarnings,
                    marketplace_plan: meta.marketplacePlan,
                    recovery_used: meta.recoveryUsed,
                    recovery_reason: meta.recoveryReason,
                     recovery_actions: meta.recoveryActions,
                     public_response: meta.publicResponse,
                    progress_steps: m.progress_steps ?? [],
                    trace_events: m.trace_events ?? [],
                  }
                : m
            )
          );
           setIsStreaming(false);
           sendingRef.current = false;
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
           sendingRef.current = false;
           stopRef.current = null;
        },
      }
    );

    stopRef.current = stop;
    return completion;
  };

  const stopStream = () => {
    stopRef.current?.();
    stopRef.current = null;
    sendingRef.current = false;
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
    const result = await feedbackService.create(
      backendId,
      rating,
      apiKey,
      comment,
      categories
    );
    if (!result.ok) {
      setMessages((prev) =>
        prev.map((m) => m.id === localId ? { ...m, feedback: undefined } : m)
      );
      toast.error("Le feedback n’a pas pu être enregistré");
    }
  };

  const handlePublicAction = async (
    response: PublicChatResponseV2,
    action: PublicChatActionV2
  ) => {
    const actionInstanceId = action.action_instance_id;
    if (
      action.confirmation_required &&
      (!actionInstanceId || !action.confirmation_token)
    ) {
      throw new Error("invalid_confirmation_metadata");
    }
    if (!action.confirmation_required) {
      if (
        action.status !== "ready" ||
        action.action_instance_id !== null ||
        action.confirmation_token !== null
      ) {
        throw new Error("invalid_ready_action");
      }
      window.location.assign(action.url);
      return;
    }
    if (!actionInstanceId) throw new Error("invalid_action_instance");
    const confirmed = await confirmPublicChatAction(
      action,
      response.conversation_id,
      apiKey,
      actionInstanceId
    );
    window.location.assign(confirmed.url);
  };

  const submitClarification = async (
    clarification: PublicChatClarificationV2,
    answers: string[]
  ) => {
    const clarificationResponse: ClarificationResponsePayload = {
      set_id: clarification.set_id,
      memory_revision: clarification.memory_revision,
      answers: clarification.question_ids.map((questionId, index) => ({
        question_id: questionId,
        value: answers[index]?.trim() ?? "",
      })),
    };
    const content = clarification.questions
      .map((question, index) => `${question}\n${answers[index]?.trim() ?? ""}`)
      .join("\n\n");
    const completed = await sendMessage({ content, clarificationResponse });
    if (!completed) throw new Error("clarification_not_committed");
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
          <div className="mx-auto max-w-6xl space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isAdmin={isAdmin}
                onStop={stopStream}
                onFeedback={(rating, comment, categories) => {
                  if (!msg.backend_id) return;
                  handleFeedback(msg.id, msg.backend_id, rating, comment, categories);
                }}
                onPublicAction={handlePublicAction}
                onSubmitClarification={submitClarification}
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
              <Button size="icon" className="size-8 shrink-0" onClick={() => sendMessage()} disabled={!input.trim()}>
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
  onStop?: () => void;
  onFeedback: (rating: FeedbackRating, comment?: string, categories?: string[]) => void;
  onPublicAction: (
    response: PublicChatResponseV2,
    action: PublicChatActionV2
  ) => Promise<void>;
  onSubmitClarification: (
    clarification: PublicChatClarificationV2,
    answers: string[]
  ) => Promise<void>;
}

type ParsedTable = {
  title?: string;
  headers: string[];
  rows: string[][];
};

type ActionLink = {
  label: string;
  url: string;
  description?: string;
};

const URL_RE = /https?:\/\/[^\s)\]}]+/gi;

function normalizeHeading(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanUrl(value: string): string {
  return value.replace(/[.,;:!?]+$/g, "");
}

function compactActionLabel(label: string): string {
  const cleaned = label.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Ouvrir la page";
  return cleaned.length > 64 ? `${cleaned.slice(0, 61).trim()}...` : cleaned;
}

function readMarketplaceActionLinks(plan: Record<string, unknown> | undefined): ActionLink[] {
  const siteActions = Array.isArray(plan?.["site_actions"]) ? plan["site_actions"] : [];
  return siteActions.reduce<ActionLink[]>((links, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return links;
    const action = item as Record<string, unknown>;
    const label = typeof action.label === "string" ? action.label.trim() : "";
    const url = typeof action.url === "string" ? cleanUrl(action.url.trim()) : "";
    const description = typeof action.description === "string" ? action.description.trim() : "";
    if (!url) return links;
    links.push({
      label: compactActionLabel(label || description || "Ouvrir la page"),
      url,
      description: description || undefined,
    });
    return links;
  }, []);
}

function parseActionLine(line: string): ActionLink[] {
  URL_RE.lastIndex = 0;
  const matches = [...line.matchAll(URL_RE)];
  if (!matches.length) return [];

  return matches.map((match) => {
    const rawUrl = match[0];
    const url = cleanUrl(rawUrl);
    const urlIndex = match.index ?? line.indexOf(rawUrl);
    const before = line
      .slice(0, urlIndex)
      .replace(/^[-*]\s*/, "")
      .replace(/\s*[:\-–—]\s*$/, "")
      .trim();
    const after = line
      .slice(urlIndex + rawUrl.length)
      .replace(/^\s*[-–—:]\s*/, "")
      .trim();

    return {
      label: compactActionLabel(before || after || "Ouvrir la page"),
      url,
      description: after || undefined,
    };
  });
}

function extractActionLinks(content: string, plan: Record<string, unknown> | undefined): ActionLink[] {
  const links = readMarketplaceActionLinks(plan);
  const raw = stripCodeFences(content);
  const lines = raw.split("\n");
  let inActions = false;

  for (const line of lines) {
    const normalized = normalizeHeading(line.trim());
    if (/^(actions proposees|actions to take)\s*:/.test(normalized)) {
      inActions = true;
      continue;
    }
    if (/^(informations a preciser|information to clarify|recommandations|recommendations)\s*:/.test(normalized)) {
      inActions = false;
    }
    if (inActions) {
      links.push(...parseActionLine(line));
    }
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.url}|${link.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function removeActionText(content: string, links: ActionLink[]): string {
  if (!links.length) return content;
  const urls = new Set(links.map((link) => link.url));
  let skippingActions = false;
  const kept: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const normalized = normalizeHeading(trimmed);

    if (/^(actions proposees|actions to take)\s*:/.test(normalized)) {
      skippingActions = true;
      continue;
    }

    if (/^(informations a preciser|information to clarify)\s*:/.test(normalized)) {
      skippingActions = false;
    }

    const lineUrls = [...line.matchAll(URL_RE)].map((match) => cleanUrl(match[0]));
    const hasActionUrl = lineUrls.some((url) => urls.has(url));
    const isGenericActionLine = /^[-*]\s*(continuer|continue)\b/i.test(trimmed);

    if (skippingActions && (!trimmed || trimmed.startsWith("-") || hasActionUrl || isGenericActionLine)) {
      continue;
    }
    if (hasActionUrl) continue;

    kept.push(line);
  }

  const hasRecommendationItems = kept.some((line) => /^[-*]\s*(recommandation|option|main|complementary)\b/i.test(line.trim()));
  return kept
    .filter((line) => {
      const normalized = normalizeHeading(line.trim());
      if (/^(recommandations|recommendations)\s*:/.test(normalized) && !hasRecommendationItems) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ActionLinkButtons({ links }: { links: ActionLink[] }) {
  if (!links.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link, idx) => (
        <Button
          key={`${link.url}-${idx}`}
          asChild
          size="sm"
          variant={idx === 0 ? "default" : "secondary"}
          className="h-auto min-h-9 max-w-full rounded-full px-3 py-2 text-xs shadow-sm"
        >
          <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.description || link.label}>
            <ShoppingBag className="size-3.5" />
            <span className="max-w-[220px] truncate sm:max-w-[280px]">{link.label}</span>
            <ExternalLink className="size-3.5 opacity-80" />
          </a>
        </Button>
      ))}
    </div>
  );
}

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

function formatReasonCode(reason: string | undefined): string | null {
  if (!reason) return null;
  const value = reason.trim();
  if (!value) return null;
  return value.replace(/_/g, " ");
}

function buildRecoveryMeta(message: UiMessage): RecoveryMetadata | null {
  if (!message.recovery_used) return null;
  return {
    used: true,
    reason: message.recovery_reason ?? "",
    actions: message.recovery_actions ?? [],
  };
}

function AgenticTelemetry({ message }: { message: UiMessage }) {
  const modules = message.selected_modules ?? [];
  const results = message.module_results ?? [];
  const conflicts = message.module_conflicts ?? [];
  const warnings = message.module_warnings ?? [];
  const market = marketplaceSummary(message.marketplace_plan);
  const nlu = message.nlu;
  const recovery = buildRecoveryMeta(message);
  const recoveryReason = formatReasonCode(recovery?.reason);
  const hasTelemetry =
    modules.length > 0 ||
    results.length > 0 ||
    conflicts.length > 0 ||
    warnings.length > 0 ||
    !!market ||
    !!nlu ||
    !!recovery;

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
        {nlu?.route_hint && (
          <Badge variant="outline" className="h-5 text-[10px]">NLU {nlu.route_hint}</Badge>
        )}
        {nlu?.latency_ms !== undefined && (
          <Badge variant="outline" className="h-5 text-[10px]">{nlu.latency_ms.toFixed(1)}ms</Badge>
        )}
        {recoveryReason && (
          <Badge variant="outline" className="h-5 border-warning/40 bg-warning/10 text-[10px] text-warning-foreground">
            recovery {recoveryReason}
          </Badge>
        )}
      </div>

      {nlu && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="h-6 rounded-full bg-background/60 text-[11px]">
            intent {nlu.primary_intent} · {Math.round(nlu.confidence * 100)}%
          </Badge>
          <Badge variant="outline" className="h-6 rounded-full bg-background/60 text-[11px]">
            langue {nlu.language}
          </Badge>
          {nlu.requires_context && (
            <Badge variant="outline" className="h-6 rounded-full bg-background/60 text-[11px]">
              contexte requis
            </Badge>
          )}
          {nlu.recommended_sources.map((source) => (
            <Badge key={source} variant="outline" className="h-6 rounded-full bg-background/60 text-[11px]">
              <ModuleIcon moduleId={source} className="size-3" /> {moduleLabel(source)}
            </Badge>
          ))}
        </div>
      )}

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

      {recovery && (
        <div className="mt-2 space-y-1.5">
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-warning-foreground">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-3.5 shrink-0" /> Recovery actif
            </div>
            {recoveryReason && (
              <div className="mt-1 text-[11px] opacity-90">
                Cause: <span className="font-mono">{recoveryReason}</span>
              </div>
            )}
          </div>
          {recovery.actions.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-background/45 px-2.5 py-2 text-[11px] text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">Actions proposées</div>
              <div className="space-y-1">
                {recovery.actions.slice(0, 3).map((action) => (
                  <div key={action} className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function AgenticThinking({
  steps,
  compact = false,
  onStop,
  startedAt,
}: {
  steps: UiMessage["progress_steps"];
  compact?: boolean;
  onStop?: () => void;
  startedAt?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const activeSteps = steps?.length ? steps : [{ step: "init", message: "Analyse de votre question..." }];
  const latestStep = activeSteps[activeSteps.length - 1];
  const currentIndex = progressStageIndex(latestStep?.step, activeSteps.length - 1);
  const latest = activeSteps[activeSteps.length - 1]?.message ?? "Orchestration en cours...";
  const currentStage = THINKING_STAGES[currentIndex];
  const startedAtMs = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((now - startedAtMs) / 1000))
    : 0;
  const elapsedLabel = elapsedSeconds < 60
    ? `${elapsedSeconds}s`
    : `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (compact) {
    return (
      <div className="mt-2 rounded-xl border border-primary/15 bg-background/55 p-2.5 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="absolute inset-0 rounded-lg border border-primary/25 animate-ping" />
            <ProgressStepIcon step={latestStep?.step} className="relative size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              Assistant Agentique
              <Badge variant="outline" className="h-4 rounded-full border-primary/20 bg-primary/5 px-1.5 text-[9px] text-primary">
                {currentStage.short}
              </Badge>
              <Badge variant="secondary" className="h-4 rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">Multi-agents</Badge>
              <span className="text-[10px] font-normal text-muted-foreground">{elapsedLabel}</span>
            </div>
            <p className="truncate text-muted-foreground">{latest}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl py-1 text-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-primary/35 border-t-primary animate-spin" />
          <span className="size-1.5 rounded-full bg-primary" />
        </span>
        <span className="truncate text-base text-muted-foreground">{latest}</span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {elapsedLabel}
        </span>
        {onStop && (
          <button type="button" onClick={onStop} className="ml-auto rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            Arrêter
          </button>
        )}
      </div>

      <div className="ml-2.5 mt-4 border-l border-border/70 pl-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          <span className="font-semibold text-foreground">{currentStage.title}</span>
          <Badge variant="secondary" className="h-6 rounded-full bg-muted px-2 text-xs text-muted-foreground">
            {currentIndex + 1}/{THINKING_STAGES.length}
          </Badge>
          <Badge variant="outline" className="h-6 rounded-full border-primary/20 bg-primary/5 px-2 text-xs text-primary">
            Multi-agents
          </Badge>
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-5">
          {THINKING_STAGES.map((step, idx) => {
            const StepIcon = step.icon;
            const done = idx < currentIndex;
            const active = idx === currentIndex;
            return (
              <div key={step.title} className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors",
                done && "border-success/25 bg-success/10 text-success",
                active && "border-primary/25 bg-primary/10 text-primary",
                !done && !active && "border-border/60 bg-background/50 text-muted-foreground"
              )}>
                {done ? <CheckCircle2 className="size-3" /> : <StepIcon className={cn("size-3", active && "animate-pulse")} />}
                <span className="truncate">{step.short}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {activeSteps.slice(-4).map((s, idx, visibleSteps) => {
            const isLast = idx === visibleSteps.length - 1;
            const isWarning = isWarningProgressStep(s.step);
            return (
              <div key={`${s.step}-${idx}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  isWarning
                    ? "border-warning/30 bg-warning/10 text-warning-foreground"
                    : isLast
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/50 text-muted-foreground"
                )}>
                  <ProgressStepIcon step={s.step} className={cn("size-3", isLast && !isWarning && "animate-pulse")} />
                </span>
                <span className={cn("truncate", isLast && "font-medium text-foreground")}>{s.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PublicResponsePanel({
  response,
  onPublicAction,
  onSubmitClarification,
}: {
  response: PublicChatResponseV2;
  onPublicAction: BubbleProps["onPublicAction"];
  onSubmitClarification: BubbleProps["onSubmitClarification"];
}) {
  const clarification = response.clarification;
  const [answers, setAnswers] = useState<string[]>(
    () => clarification?.questions.map(() => "") ?? []
  );
  const [submittingClarification, setSubmittingClarification] = useState(false);
  const [clarificationSubmitted, setClarificationSubmitted] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const submitAnswers = async () => {
    if (!clarification || answers.some((answer) => !answer.trim())) return;
    setSubmittingClarification(true);
    try {
      await onSubmitClarification(clarification, answers);
      setClarificationSubmitted(true);
    } catch {
      toast.error("Impossible d’envoyer la clarification");
    } finally {
      setSubmittingClarification(false);
    }
  };

  const runAction = async (action: PublicChatActionV2) => {
    setPendingAction(action.action_id);
    try {
      await onPublicAction(response, action);
    } catch {
      toast.error("Cette action n’est plus disponible");
      setPendingAction(null);
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
      {response.recommendations.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {response.recommendations.map((recommendation) => (
            <div
              key={recommendation.capability_id}
              className="rounded-xl border border-primary/15 bg-background/55 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{recommendation.name}</p>
                {recommendation.optional && (
                  <Badge variant="outline" className="text-[10px]">Complément</Badge>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {recommendation.description}
              </p>
              {recommendation.reasons.map((reason) => (
                <p key={reason} className="mt-2 text-xs text-foreground/80">{reason}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {clarification && !clarificationSubmitted && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">Précision nécessaire</p>
          <p className="mt-1 text-xs text-muted-foreground">{clarification.reason}</p>
          <div className="mt-3 space-y-3">
            {clarification.questions.map((question, index) => (
              <label key={clarification.question_ids[index]} className="block space-y-1.5">
                <span className="text-xs font-medium">{question}</span>
                <Textarea
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) =>
                      current.map((answer, answerIndex) =>
                        answerIndex === index ? event.target.value : answer
                      )
                    )
                  }
                  rows={2}
                  maxLength={2000}
                  disabled={submittingClarification}
                  className="min-h-16 bg-background"
                />
              </label>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={
              submittingClarification || answers.some((answer) => !answer.trim())
            }
            onClick={submitAnswers}
          >
            {submittingClarification && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Envoyer les précisions
          </Button>
        </div>
      )}

      {response.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {response.actions.map((action) => (
            <Button
              key={action.action_id}
              type="button"
              size="sm"
              variant="outline"
              className="h-auto max-w-full whitespace-normal text-left"
              disabled={pendingAction === action.action_id}
              onClick={() => runAction(action)}
            >
              {pendingAction === action.action_id ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 size-3.5" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {response.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {response.sources.map((source) => (
            <Badge key={source.citation_id} variant="outline" className="text-[10px]">
              {source.label}
            </Badge>
          ))}
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <ShieldCheck className="size-3" /> {response.quality.status}
          </Badge>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isAdmin,
  onStop,
  onFeedback,
  onPublicAction,
  onSubmitClarification,
}: BubbleProps) {
  const isUser = message.role === "user";
  const cleanedContent = isUser ? message.content : removeDbTableMarker(message.content);
  const actionLinks = !isUser ? extractActionLinks(cleanedContent, message.marketplace_plan) : [];
  const displayContent = !isUser ? removeActionText(cleanedContent, actionLinks) : cleanedContent;
  const isAsciiTable = !isUser && displayContent.includes("Table ") && displayContent.includes("+-") && displayContent.includes("| ");
  const parsedTable = !isUser ? parseAssistantTable(message.content) : null;
  const showAgenticPanel = !isUser && message.streaming && !message.content;
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

      <div className={cn(
        "space-y-1",
        showAgenticPanel ? "min-w-0 flex-1" : "max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Bubble */}
        <div className={cn(
          "text-sm",
          showAgenticPanel
            ? "rounded-none bg-transparent p-0 text-foreground"
            : cn(
                "rounded-2xl px-4 py-2.5",
                isUser
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )
        )}>
          {message.streaming && !message.content ? (
            <AgenticThinking steps={message.progress_steps} onStop={onStop} startedAt={message.timestamp} />
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
              <pre className="whitespace-pre overflow-x-auto text-xs leading-relaxed font-mono">{displayContent}</pre>
            ) : (
              displayContent && <p className="whitespace-pre-wrap leading-relaxed">{displayContent}</p>
            )
          )}
          {!isUser && <ActionLinkButtons links={actionLinks} />}
          {!isUser && message.public_response && (
            <PublicResponsePanel
              response={message.public_response}
              onPublicAction={onPublicAction}
              onSubmitClarification={onSubmitClarification}
            />
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
          )}

          {message.streaming && message.content && (message.progress_steps?.length ?? 0) > 0 && (
            <AgenticThinking steps={message.progress_steps} compact startedAt={message.timestamp} />
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
            {isAdmin && message.nlu?.route_hint && (
              <Badge variant="outline" className="text-xs h-4">
                nlu {message.nlu.route_hint}
              </Badge>
            )}
            {isAdmin && message.recovery_used && message.recovery_reason && (
              <Badge variant="outline" className="text-xs h-4 border-warning/40 bg-warning/10 text-warning-foreground">
                recovery {formatReasonCode(message.recovery_reason)}
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
