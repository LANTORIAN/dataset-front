/**
 * conversations.service.ts
 * Gestion de l'historique des conversations d'un projet.
 * Auth : X-API-Key (clé du projet).
 */

import {
  keyDel,
  keyGet,
  keyGetV2,
  keyPost,
  probePublicChatV2,
} from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import { parsePublicChatResponseV2 } from "@/services/chat.service";
import type {
  Conversation,
  ConversationListResponse,
  ConversationDetail,
  ConversationMessage,
  PublicConversationMessagesV2,
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
      async () => {
        const publicV2 = await probePublicChatV2(apiKey);
        if (!publicV2) {
          return keyGet<{ messages: ConversationMessage[] }>(
            `/conversations/${conversationId}/messages`,
            apiKey
          );
        }
        const payload = await keyGetV2<unknown>(
          `/conversations/${conversationId}/messages`,
          apiKey
        );
        return parsePublicConversationMessages(payload, conversationId);
      },
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

function parsePublicConversationMessages(
  value: unknown,
  conversationId: string
): PublicConversationMessagesV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Historique public v2 invalide");
  }
  const payload = value as Record<string, unknown>;
  if (
    payload.schema_version !== "conversation.messages.public.v2" ||
    payload.conversation_id !== conversationId ||
    !Array.isArray(payload.messages)
  ) {
    throw new Error("Historique public v2 invalide");
  }
  const messages = payload.messages.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Message public v2 invalide");
    }
    const message = item as Record<string, unknown>;
    if (
      message.schema_version !== "conversation.message.public.v2" ||
      typeof message.id !== "string" ||
      message.conversation_id !== conversationId ||
      !["user", "assistant"].includes(String(message.role)) ||
      typeof message.content !== "string" ||
      typeof message.timestamp !== "string" ||
      Number.isNaN(Date.parse(message.timestamp))
    ) {
      throw new Error("Message public v2 invalide");
    }
    const publicResponse = message.public_response === null
      ? null
      : parsePublicChatResponseV2(message.public_response);
    if (
      message.public_response !== null &&
      (!publicResponse ||
        publicResponse.conversation_id !== conversationId ||
        publicResponse.assistant_message.id !== message.id ||
        publicResponse.assistant_message.content !== message.content)
    ) {
      throw new Error("Payload public v2 incohérent avec l’historique");
    }
    return {
      schema_version: "conversation.message.public.v2" as const,
      id: message.id,
      conversation_id: conversationId,
      role: message.role as "user" | "assistant",
      content: message.content,
      timestamp: message.timestamp,
      public_response: publicResponse,
    };
  });
  return {
    schema_version: "conversation.messages.public.v2",
    conversation_id: conversationId,
    messages,
  };
}
