/**
 * analytics.service.ts
 * Métriques globales et par projet.
 * Auth : Bearer JWT (utilisateur approuvé).
 */

import { bearerGet } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  AnalyticsOverview,
  AnalyticsTrend,
  TopQuestion,
  FailedQuery,
  SatisfactionStats,
  CostStats,
} from "@/types";

export type TrendPeriod = "daily" | "weekly" | "monthly";

export const analyticsService = {
  /**
   * Vue d'ensemble globale (tous projets confondus).
   */
  overview(days = 30) {
    return withService(
      () => bearerGet<AnalyticsOverview>(`/analytics/overview?days=${days}`),
      {
        showErrorToast: true,
        errorMessage: "Impossible de charger les analytics",
      }
    );
  },

  /**
   * Vue d'ensemble pour un projet spécifique.
   */
  projectOverview(projectId: string, days = 30) {
    return withService(
      () =>
        bearerGet<AnalyticsOverview>(
          `/analytics/projects/${projectId}?days=${days}`
        ),
      { showErrorToast: true }
    );
  },

  /**
   * Tendances (conversations, messages, temps de réponse) par période.
   */
  trends(projectId: string, days = 30, period: TrendPeriod = "daily") {
    return withService(
      () =>
        bearerGet<AnalyticsTrend[]>(
          `/analytics/projects/${projectId}/trends?days=${days}&period=${period}`
        ),
      { showErrorToast: false }
    );
  },

  /**
   * Questions les plus fréquentes.
   */
  topQuestions(projectId: string, limit = 10, days = 30) {
    return withService(
      () =>
        bearerGet<{ questions: TopQuestion[]; total: number }>(
          `/analytics/projects/${projectId}/top-questions?limit=${limit}&days=${days}`
        ),
      { showErrorToast: false }
    );
  },

  /**
   * Requêtes ayant échoué.
   */
  failedQueries(projectId: string, limit = 20, days = 30) {
    return withService(
      () =>
        bearerGet<{ queries: FailedQuery[]; total: number }>(
          `/analytics/projects/${projectId}/failed-queries?limit=${limit}&days=${days}`
        ),
      { showErrorToast: false }
    );
  },

  /**
   * Stats de satisfaction (feedbacks positifs / négatifs).
   */
  satisfaction(projectId: string, days = 30) {
    return withService(
      () =>
        bearerGet<SatisfactionStats>(
          `/analytics/projects/${projectId}/satisfaction?days=${days}`
        ),
      { showErrorToast: false }
    );
  },

  /**
   * Coûts estimés (tokens + modèle).
   */
  costs(projectId: string, days = 30) {
    return withService(
      () =>
        bearerGet<CostStats>(
          `/analytics/projects/${projectId}/costs?days=${days}`
        ),
      { showErrorToast: false }
    );
  },

  /**
   * Dashboard complet d'un projet (toutes les métriques en une requête).
   */
  dashboard(projectId: string, days = 30) {
    return withService(
      () =>
        bearerGet<{
          overview: AnalyticsOverview;
          trends: AnalyticsTrend[];
          top_questions: TopQuestion[];
          failed_queries: FailedQuery[];
          satisfaction: SatisfactionStats;
        }>(`/analytics/projects/${projectId}/dashboard?days=${days}`),
      {
        showErrorToast: true,
        errorMessage: "Impossible de charger le dashboard analytique",
      }
    );
  },

  /**
   * Export CSV ou JSON des données.
   */
  export(projectId: string, format: "csv" | "json" = "json", days = 30) {
    return withService(
      () =>
        bearerGet<unknown>(
          `/analytics/projects/${projectId}/export?format=${format}&days=${days}`
        ),
      { successMessage: `Export ${format.toUpperCase()} prêt` }
    );
  },
};
