/**
 * chat.service.ts
 * Streaming SSE du chat IA.
 * Auth : X-API-Key (clé du projet) passée en query param
 *        (EventSource ne supporte pas les headers custom).
 */

import {
  createChatStream,
  keyPostV2,
} from "@/lib/api/client";
import type { StreamOptions } from "@/lib/api/client";
import type {
  ChatStreamChunk,
  NLUResult,
  PublicChatActionV2,
  PublicChatResponseV2,
} from "@/types";

// ── Callbacks ──────────────────────────────────────────────────────────────

export interface StreamDoneMetadata {
  conversationId?: string;
  messageId?: string;
  sourceType?: string;
  intent?: string;
  plannedIntent?: string;
  answerMode?: string;
  confidenceLevel?: string;
  cached?: boolean;
  responseTime?: number;
  nlu?: NLUResult;
  recoveryUsed?: boolean;
  recoveryReason?: string;
  recoveryActions?: string[];
  selectedModules?: string[];
  moduleResults?: Array<Record<string, unknown>>;
  moduleConflicts?: Array<Record<string, unknown>>;
  moduleWarnings?: string[];
  marketplacePlan?: Record<string, unknown>;
  publicResponse?: PublicChatResponseV2;
}

export interface ClarificationResponsePayload {
  set_id: string;
  memory_revision: number;
  answers: Array<{ question_id: string; value: string }>;
}

export interface ActionConfirmationResult {
  schema_version: "action_confirmation_result.v1";
  action_instance_id: string;
  action_id: string;
  label: string;
  action_type: string;
  url: string;
  status: "confirmed";
  confirmed_at: string;
}

export async function confirmPublicChatAction(
  action: PublicChatActionV2,
  conversationId: string,
  apiKey: string,
  idempotencyKey: string
): Promise<ActionConfirmationResult> {
  if (
    !action.confirmation_required ||
    !action.action_instance_id ||
    !action.confirmation_token
  ) {
    throw new Error("Métadonnées de confirmation absentes");
  }
  const result = await keyPostV2<unknown>(
    `/chat/actions/${action.action_instance_id}/confirm`,
    apiKey,
    {
      schema_version: "action_confirmation_request.v1",
      conversation_id: conversationId,
      idempotency_key: idempotencyKey,
      confirmation_token: action.confirmation_token,
    }
  );
  if (
    !isRecord(result) ||
    result.schema_version !== "action_confirmation_result.v1" ||
    result.action_instance_id !== action.action_instance_id ||
    !isUuid(result.action_instance_id) ||
    result.action_id !== action.action_id ||
    result.label !== action.label ||
    result.action_type !== action.action_type ||
    result.url !== action.url ||
    typeof result.url !== "string" ||
    !isSafePublicUrl(result.url) ||
    result.status !== "confirmed" ||
    !isIsoDate(result.confirmed_at)
  ) {
    throw new Error("Confirmation d’action invalide");
  }
  return result as unknown as ActionConfirmationResult;
}

export interface StreamCallbacks {
  /** Appelé à chaque fragment de texte reçu. */
  onChunk: (text: string) => void;
  /** Appelé quand le stream est terminé avec les métadonnées. */
  onDone: (meta: StreamDoneMetadata) => void;
  /** Appelé en cas d'erreur (réseau ou erreur renvoyée par le backend). */
  onError: (message: string) => void;
  /** Appelé à chaque étape de progression côté backend. */
  onProgress?: (progress: { step: string; message: string }) => void;
  /** Appelé pour les événements de raisonnement/vérification destinés au debug UI. */
  onTrace?: (trace: { kind: "reasoning" | "verify"; title: string; message: string }) => void;
}

function streamChatV1(
  opts: StreamOptions,
  callbacks: StreamCallbacks
): { stop: () => void } {
  let conversationId: string | undefined;
  let messageId: string | undefined;
  let sourceType: string | undefined;
  let marketplacePlan: Record<string, unknown> | undefined;
  let terminal = false;
  let stopped = false;

  const finishError = (message: string) => {
    if (terminal || stopped) return;
    terminal = true;
    control.stop();
    callbacks.onError(message);
  };

  const finishDone = (metadata: StreamDoneMetadata) => {
    if (terminal || stopped) return;
    terminal = true;
    callbacks.onDone(metadata);
  };

  const control = createChatStream({ ...opts, contractVersion: "v1" }, {
    onEvent: (eventName, data) => {
      if (terminal || stopped) return;
      if (eventName === "meta") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          conversationId = parsed.conversation_id as string | undefined;
          messageId = typeof parsed.assistant_message_id === "string"
            ? parsed.assistant_message_id
            : undefined;
          sourceType = typeof parsed.source_category === "string"
            ? parsed.source_category
            : undefined;
          marketplacePlan = parsed.marketplace_plan && typeof parsed.marketplace_plan === "object" && !Array.isArray(parsed.marketplace_plan)
            ? parsed.marketplace_plan as Record<string, unknown>
            : undefined;
        } catch { /* ignore malformed meta */ }
        return;
      }

      if (eventName === "done") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          messageId = typeof parsed.assistant_message_id === "string"
            ? parsed.assistant_message_id
            : messageId;
          finishDone({
            conversationId,
            messageId,
            sourceType,
            marketplacePlan,
            responseTime: typeof parsed.response_time_ms === "number"
              ? parsed.response_time_ms / 1000
              : undefined,
          });
        } catch {
          finishDone({
            conversationId,
            messageId,
            sourceType,
            marketplacePlan,
          });
        }
        return;
      }

      if (eventName === "error") {
        finishError(data || "Erreur du serveur.");
        return;
      }

      if (eventName === "progress") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const step = typeof parsed.step === "string" ? parsed.step : "progress";
          const message = typeof parsed.message === "string" ? parsed.message : "Traitement en cours...";
          callbacks.onProgress?.({ step, message });
        } catch {
          callbacks.onProgress?.({ step: "progress", message: data || "Traitement en cours..." });
        }
        return;
      }

      if (eventName === "reasoning" || eventName === "verify") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const title = typeof parsed.title === "string" ? parsed.title : eventName;
          const message = typeof parsed.message === "string" ? parsed.message : data;
          callbacks.onTrace?.({
            kind: eventName,
            title,
            message,
          });
        } catch {
          callbacks.onTrace?.({ kind: eventName, title: eventName, message: data });
        }
        return;
      }

      try {
        const chunk = JSON.parse(data) as ChatStreamChunk;
        if (chunk.error) { finishError(chunk.error); return; }
        if (chunk.content) { callbacks.onChunk(chunk.content); }
      } catch {
        if (data.trim()) callbacks.onChunk(data);
      }
    },
    onError: () => {
      finishError("Connexion perdue. Vérifiez votre réseau ou la clé API.");
    },
    onHttpError: () => {
      finishError("Le serveur v1 a refusé la requête.");
    },
    onEnd: () => {
      if (!terminal) {
        finishError("Le flux v1 s'est terminé sans événement terminal.");
      }
    },
  });
  return {
    stop: () => {
      stopped = true;
      control.stop();
    },
  };
}

export function streamChat(
  opts: StreamOptions,
  callbacks: StreamCallbacks
): { stop: () => void; completion: Promise<boolean> } {
  const requestId = opts.requestId ?? crypto.randomUUID();
  let activeStop: () => void = () => undefined;
  let stopped = false;
  let settled = false;
  let settleCompletion: (success: boolean) => void = () => undefined;
  const completion = new Promise<boolean>((resolve) => {
    settleCompletion = resolve;
  });

  const fail = (message: string) => {
    if (settled || stopped) return;
    settled = true;
    activeStop();
    callbacks.onError(message);
    settleCompletion(false);
  };

  const succeed = (metadata: StreamDoneMetadata) => {
    if (settled || stopped) return;
    settled = true;
    activeStop();
    callbacks.onDone(metadata);
    settleCompletion(true);
  };

  activeStop = streamChatV1(
    { ...opts, requestId, contractVersion: "v1" },
    { ...callbacks, onDone: succeed, onError: fail }
  ).stop;

  return {
    completion,
    stop: () => {
      if (stopped) return;
      stopped = true;
      activeStop();
      if (!settled) {
        settled = true;
        settleCompletion(false);
      }
    },
  };
}

function isPublicChatResponseV2(value: unknown): value is PublicChatResponseV2 {
  if (!isRecord(value)) return false;
  const response = value;
  const assistant = response.assistant_message;
  const quality = response.quality;
  const outcome = response.outcome;
  const expectedQuality: Record<string, string> = {
    answer: "accepted",
    recommendation: "accepted",
    hybrid: "accepted",
    action: "confirmation_required",
    clarification: "clarification",
    out_of_scope: "limited",
    refusal: "refused",
  };
  if (
    !isUuid(response.conversation_id) ||
    !isUuid(response.user_message_id) ||
    typeof response.trace_id !== "string" ||
    !response.trace_id ||
    typeof outcome !== "string" ||
    !(outcome in expectedQuality) ||
    !isRecord(assistant) ||
    !isUuid(assistant.id) ||
    assistant.role !== "assistant" ||
    typeof assistant.content !== "string" ||
    !assistant.content ||
    !isIsoDate(assistant.created_at) ||
    !isRecord(quality) ||
    quality.reviewed !== true ||
    quality.status !== expectedQuality[outcome]
  ) {
    return false;
  }
  const recommendations = response.recommendations;
  const actions = response.actions;
  const sources = response.sources;
  const clarification = response.clarification;
  const explanation = response.explanation;
  if (
    !Array.isArray(recommendations) ||
    !recommendations.every(isPublicRecommendation) ||
    !Array.isArray(actions) ||
    !actions.every(isPublicAction) ||
    !Array.isArray(sources) ||
    !sources.every(isPublicSource) ||
    !(clarification === null || isPublicClarification(clarification)) ||
    !(explanation === null || isPublicExplanation(explanation))
  ) {
    return false;
  }
  if (
    (outcome === "clarification") !== (clarification !== null) ||
    (outcome === "recommendation" && recommendations.length === 0) ||
    (outcome === "hybrid" && recommendations.length === 0) ||
    (outcome === "action" && actions.length === 0) ||
    (outcome === "answer" && (actions.length > 0 || recommendations.length > 0)) ||
    (outcome === "clarification" &&
      (actions.length > 0 || recommendations.length > 0 || sources.length > 0)) ||
    (outcome === "out_of_scope" && actions.length > 0) ||
    (outcome === "refusal" &&
      (actions.length > 0 || recommendations.length > 0 || sources.length > 0))
  ) {
    return false;
  }
  return (
    response.schema_version === "chat.public.v2" &&
    hasOnlyKeys(response, [
      "schema_version",
      "conversation_id",
      "user_message_id",
      "assistant_message",
      "outcome",
      "recommendations",
      "actions",
      "clarification",
      "sources",
      "explanation",
      "quality",
      "trace_id",
    ])
  );
}

export function parsePublicChatResponseV2(
  value: unknown
): PublicChatResponseV2 | null {
  return isPublicChatResponseV2(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && !!item.trim());
}

function isSafePublicUrl(value: string): boolean {
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes("\\")) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" &&
      !!parsed.hostname &&
      !parsed.username &&
      !parsed.password;
  } catch {
    return false;
  }
}

function isPublicRecommendation(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.capability_id === "string" && !!value.capability_id &&
    typeof value.name === "string" && !!value.name.trim() &&
    typeof value.description === "string" && !!value.description.trim() &&
    isStringArray(value.reasons) &&
    typeof value.optional === "boolean";
}

function isPublicAction(value: unknown): boolean {
  if (!isRecord(value) ||
    typeof value.action_id !== "string" || !value.action_id ||
    typeof value.label !== "string" || !value.label.trim() ||
    typeof value.action_type !== "string" || !value.action_type ||
    typeof value.url !== "string" || !isSafePublicUrl(value.url) ||
    typeof value.confirmation_required !== "boolean") {
    return false;
  }
  if (value.confirmation_required) {
    return value.status === "confirmation_required" &&
      isUuid(value.action_instance_id) &&
      isIsoDate(value.expires_at) &&
      typeof value.confirmation_token === "string" &&
      /^[a-f0-9]{64}$/.test(value.confirmation_token);
  }
  return value.status === "ready" &&
    value.action_instance_id === null &&
    value.expires_at === null &&
    value.confirmation_token === null;
}

function isPublicClarification(value: unknown): boolean {
  if (!isRecord(value) ||
    !isUuid(value.set_id) ||
    !Number.isInteger(value.memory_revision) || Number(value.memory_revision) < 0 ||
    typeof value.reason !== "string" || !value.reason.trim() ||
    !isStringArray(value.questions) ||
    !Array.isArray(value.question_ids) ||
    !value.question_ids.every(isUuid)) {
    return false;
  }
  return value.questions.length > 0 &&
    value.questions.length <= 4 &&
    value.questions.length === value.question_ids.length &&
    new Set(value.question_ids).size === value.question_ids.length;
}

function isPublicSource(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.citation_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value.citation_id) &&
    ["db", "document", "external", "catalog"].includes(String(value.source_type)) &&
    typeof value.label === "string" && !!value.label.trim() &&
    (value.updated_at === null || isIsoDate(value.updated_at));
}

function isPublicExplanation(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.summary === "string" && !!value.summary.trim() &&
    isStringArray(value.selected_reasons) &&
    isStringArray(value.limitations);
}

// ── Version Promise (accumulation complète) ────────────────────────────────

export interface StreamResult {
  content: string;
  conversationId?: string;
  sourceType?: string;
  cached?: boolean;
  responseTime?: number;
}

/**
 * Attend la fin du stream et retourne le texte complet.
 * Utile pour les tests ou exports.
 */
export function streamChatPromise(opts: StreamOptions): Promise<StreamResult> {
  return new Promise((resolve, reject) => {
    let content = "";
    let meta: Omit<StreamResult, "content"> = {};

    const { stop } = streamChat(opts, {
      onChunk: (text) => { content += text; },
      onDone: (m) => {
        meta = m;
        resolve({ content, ...meta });
      },
      onError: (msg) => {
        stop();
        reject(new Error(msg));
      },
    });
  });
}

export type { StreamOptions };
