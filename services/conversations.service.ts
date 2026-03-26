/**
 * conversations.service.ts
 * Gestion de l'historique des conversations d'un projet.
 * Auth : X-API-Key (clé du projet).
 */

import { keyGet, keyPost, keyDel } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  Conversation,
  ConversationListResponse,
  ConversationDetail,
  ConversationMessage,
} from "@/types";

export const conversationsService = {
  /**
   * Liste les conversations d'un projet (paginé).
   */
  list(apiKey: string, page = 1, limit = 20) {
    return withService(
      () =>
        keyGet<ConversationListResponse>(
          `/conversations?page=${page}&limit=${limit}`,
          apiKey
        ),
      {
        showErrorToast: true,
        errorMessage: "Impossible de charger les conversations",
      }
    );
  },

  /**
   * Crée une nouvelle conversation (optionnel : message initial).
   */
  create(apiKey: string, sessionId?: string, initialMessage?: string) {
    return withService(
      () =>
        keyPost<Conversation>("/conversations", apiKey, {
          ...(sessionId ? { session_id: sessionId } : {}),
          ...(initialMessage ? { initial_message: initialMessage } : {}),
        }),
      { showErrorToast: true }
    );
  },

  /**
   * Récupère le détail d'une conversation (métadonnées + messages).
   */
  get(conversationId: string, apiKey: string) {
    return withService(
      () =>
        keyGet<ConversationDetail>(
          `/conversations/${conversationId}`,
          apiKey
        ),
      {
        showErrorToast: true,
        errorMessage: "Conversation introuvable",
      }
    );
  },

  /**
   * Récupère uniquement les messages d'une conversation.
   */
  messages(conversationId: string, apiKey: string) {
    return withService(
      () =>
        keyGet<{ messages: ConversationMessage[] }>(
          `/conversations/${conversationId}/messages`,
          apiKey
        ),
      {
        showErrorToast: true,
        errorMessage: "Impossible de charger les messages",
      }
    );
  },

  /**
   * Supprime une conversation (204).
   */
  delete(conversationId: string, apiKey: string) {
    return withService(
      () => keyDel<void>(`/conversations/${conversationId}`, apiKey),
      { successMessage: "Conversation supprimée" }
    );
  },
};
