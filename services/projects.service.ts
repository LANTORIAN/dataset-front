/**
 * projects.service.ts
 * CRUD projets + gestion des clés API + analytics par projet.
 * Auth : Bearer JWT (utilisateur connecté approuvé).
 */

import { bearerGet, bearerPost, bearerPut, bearerDel } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  Project,
  ProjectListResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
  RotateKeyResponse,
  RevealKeyResponse,
  AnalyticsOverview,
  AnalyticsTrend,
  TopQuestion,
  ProjectSetupListResponse,
  RevealAgentTokenResponse,
} from "@/types";

export const projectsService = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Récupère tous les projets (paginé, filtré). */
  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    sort_by?: "name" | "created_at" | "updated_at";
    order?: "asc" | "desc";
  } = {}) {
    const { page = 1, limit = 12, search, sort_by, order } = params;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set("search", search);
    if (sort_by) qs.set("sort_by", sort_by);
    if (order) qs.set("order", order);
    return withService(
      () => bearerGet<ProjectListResponse>(`/projects?${qs}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les projets" }
    );
  },

  listSetupSummaries(params: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 20, search } = params;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set("search", search);
    return withService(
      () => bearerGet<ProjectSetupListResponse>(`/projects/setup-summaries?${qs}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les configurations projets" }
    );
  },

  /** Récupère un projet par ID. */
  get(id: string) {
    return withService(
      () => bearerGet<Project>(`/projects/${id}`),
      { showErrorToast: true, errorMessage: "Projet introuvable" }
    );
  },

  /** Crée un projet. */
  create(payload: CreateProjectPayload) {
    return withService(
      () => bearerPost<Project>("/projects", payload),
      { successMessage: `Projet "${payload.name}" créé avec succès` }
    );
  },

  /** Met à jour un projet. */
  update(id: string, payload: UpdateProjectPayload) {
    return withService(
      () => bearerPut<Project>(`/projects/${id}`, payload),
      { successMessage: "Projet mis à jour" }
    );
  },

  /** Supprime un projet (204). */
  delete(id: string, name?: string) {
    return withService(
      () => bearerDel<void>(`/projects/${id}`),
      { successMessage: name ? `Projet "${name}" supprimé` : "Projet supprimé" }
    );
  },

  // ── Gestion des clés API ───────────────────────────────────────────────────

  /** Révèle la clé API complète. */
  revealKey(id: string) {
    return withService(
      () => bearerPost<RevealKeyResponse>(`/projects/${id}/reveal-key`),
      { showErrorToast: true }
    );
  },

  /** Fait tourner la clé API (génère une nouvelle). */
  rotateKey(id: string) {
    return withService(
      () => bearerPost<RotateKeyResponse>(`/projects/${id}/rotate-key`),
      { successMessage: "Clé API renouvelée — sauvegardez-la immédiatement." }
    );
  },

  /** Révoque la clé API courante. */
  revokeKey(id: string) {
    return withService(
      () =>
        bearerPost<{ project_id: string; message: string; revoked_at: string }>(
          `/projects/${id}/revoke-key`
        ),
      { successMessage: "Clé API révoquée" }
    );
  },

  /** Régénère une clé API (si révoquée). */
  regenerateKey(id: string) {
    return withService(
      () =>
        bearerPost<{
          project_id: string;
          new_api_key: string;
          message: string;
          generated_at: string;
        }>(`/projects/${id}/regenerate-key`),
      { successMessage: "Nouvelle clé API générée — sauvegardez-la immédiatement." }
    );
  },

  revealAgentToken(id: string) {
    return withService(
      () => bearerPost<RevealAgentTokenResponse>(`/projects/${id}/reveal-agent-token`),
      { showErrorToast: true }
    );
  },

  rotateAgentToken(id: string) {
    return withService(
      () => bearerPost<RevealAgentTokenResponse>(`/projects/${id}/rotate-agent-token`),
      { successMessage: "Token agent regenere — sauvegardez-le immediatement." }
    );
  },

  // ── Analytics par projet ───────────────────────────────────────────────────

  /** Vue d'ensemble des métriques du projet. */
  analyticsOverview(id: string, days = 30) {
    return withService(
      () =>
        bearerGet<AnalyticsOverview>(
          `/projects/${id}/analytics/overview?days=${days}`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les analytics" }
    );
  },

  /** Tendances jour par jour. */
  analyticsTrends(
    id: string,
    days = 30,
    period: "daily" | "weekly" | "monthly" = "daily"
  ) {
    return withService(
      () =>
        bearerGet<AnalyticsTrend[]>(
          `/projects/${id}/analytics/trends?days=${days}&period=${period}`
        ),
      { showErrorToast: false }
    );
  },

  /** Questions les plus posées. */
  analyticsTopQuestions(id: string, limit = 10, days = 30) {
    return withService(
      () =>
        bearerGet<{ questions: TopQuestion[] }>(
          `/projects/${id}/analytics/top-questions?limit=${limit}&days=${days}`
        ),
      { showErrorToast: false }
    );
  },
};
