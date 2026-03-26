/**
 * feedback.service.ts
 * Feedback utilisateur sur les réponses de l'IA (pouce haut / bas).
 * Auth : X-API-Key (clé du projet).
 */

import { keyPost } from "@/lib/api/client";
import { withService } from "@/lib/api/result";

export type FeedbackRating = "positive" | "negative";

export const NEGATIVE_CATEGORIES = [
  { value: "unclear",  label: "Pas clair"   },
  { value: "wrong",    label: "Incorrect"   },
  { value: "slow",     label: "Trop lent"   },
  { value: "too_long", label: "Trop long"   },
] as const;

export const feedbackService = {
  /**
   * Soumet un feedback sur un message assistant.
   * POST /feedback  { message_id, rating, comment?, categories? }
   */
  create(
    messageId: string,
    rating: FeedbackRating,
    apiKey: string,
    comment?: string,
    categories?: string[]
  ) {
    return withService(
      () =>
        keyPost<{ id: string }>(
          "/feedback",
          apiKey,
          {
            message_id: messageId,
            rating,
            ...(comment    ? { comment }    : {}),
            ...(categories ? { categories } : {}),
          }
        ),
      { showErrorToast: false }
    );
  },
};
