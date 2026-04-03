/**
 * chat.service.ts
 * Streaming SSE du chat IA.
 * Auth : X-API-Key (clé du projet) passée en query param
 *        (EventSource ne supporte pas les headers custom).
 */

import { createChatStream } from "@/lib/api/client";
import type { StreamOptions } from "@/lib/api/client";
import type { ChatStreamChunk } from "@/types";

// ── Callbacks ──────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  /** Appelé à chaque fragment de texte reçu. */
  onChunk: (text: string) => void;
  /** Appelé quand le stream est terminé avec les métadonnées. */
  onDone: (meta: {
    conversationId?: string;
    messageId?: string;
    sourceType?: string;
    cached?: boolean;
    responseTime?: number;
  }) => void;
  /** Appelé en cas d'erreur (réseau ou erreur renvoyée par le backend). */
  onError: (message: string) => void;
  /** Appelé à chaque étape de progression côté backend. */
  onProgress?: (progress: { step: string; message: string }) => void;
}

// ── streamChat ─────────────────────────────────────────────────────────────

/**
 * Lance un stream SSE et distribue les événements via les callbacks.
 * Retourne { stop } pour annuler proprement.
 */
export function streamChat(
  opts: StreamOptions,
  callbacks: StreamCallbacks
): { stop: () => void } {
  // State shared across events within a single stream
  let conversationId: string | undefined;
  let messageId: string | undefined;

  return createChatStream(opts, {
    onEvent: (eventName, data) => {
      if (eventName === "meta") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          conversationId = parsed.conversation_id as string | undefined;
          messageId      = parsed.message_id      as string | undefined;
        } catch { /* ignore malformed meta */ }
        return;
      }

      if (eventName === "done") {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          callbacks.onDone({
            conversationId,
            messageId,
            responseTime: typeof parsed.response_time_ms === "number"
              ? parsed.response_time_ms / 1000
              : undefined,
          });
        } catch {
          callbacks.onDone({ conversationId, messageId });
        }
        return;
      }

      if (eventName === "error") {
        callbacks.onError(data || "Erreur du serveur.");
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

      // Default event — content chunk (plain text) or JSON error/content
      try {
        const chunk = JSON.parse(data) as ChatStreamChunk;
        if (chunk.error) { callbacks.onError(chunk.error); return; }
        if (chunk.content) { callbacks.onChunk(chunk.content); }
      } catch {
        // Plain text content chunk
        if (data.trim()) callbacks.onChunk(data);
      }
    },
    onError: () => {
      callbacks.onError("Connexion perdue. Vérifiez votre réseau ou la clé API.");
    },
  });
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
