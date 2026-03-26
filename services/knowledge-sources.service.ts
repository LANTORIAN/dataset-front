/**
 * knowledge-sources.service.ts
 * Gestion des sources de connaissance externes d'un projet.
 * Auth : X-API-Key (clé du projet).
 */

import { keyGet, keyPost, keyPut, keyDel } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  KnowledgeSource,
  KnowledgeSourceListResponse,
  CreateKnowledgeSourcePayload,
  UpdateKnowledgeSourcePayload,
  KnowledgeSourceTestResult,
} from "@/types";

export const knowledgeSourcesService = {
  /**
   * Liste toutes les sources d'un projet.
   */
  list(projectId: string, apiKey: string) {
    return withService(
      () =>
        keyGet<KnowledgeSourceListResponse>(
          `/${projectId}/knowledge-sources`,
          apiKey
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les sources" }
    );
  },

  /**
   * Récupère une source par ID.
   */
  get(projectId: string, sourceId: string, apiKey: string) {
    return withService(
      () =>
        keyGet<KnowledgeSource>(
          `/${projectId}/knowledge-sources/${sourceId}`,
          apiKey
        ),
      { showErrorToast: true }
    );
  },

  /**
   * Crée une nouvelle source externe.
   */
  create(projectId: string, apiKey: string, payload: CreateKnowledgeSourcePayload) {
    return withService(
      () =>
        keyPost<KnowledgeSource>(
          `/${projectId}/knowledge-sources`,
          apiKey,
          payload
        ),
      { successMessage: `Source "${payload.name}" ajoutée` }
    );
  },

  /**
   * Met à jour une source.
   */
  update(
    projectId: string,
    sourceId: string,
    apiKey: string,
    payload: UpdateKnowledgeSourcePayload
  ) {
    return withService(
      () =>
        keyPut<KnowledgeSource>(
          `/${projectId}/knowledge-sources/${sourceId}`,
          apiKey,
          payload
        ),
      { successMessage: "Source mise à jour" }
    );
  },

  /**
   * Active ou désactive une source.
   */
  toggle(
    projectId: string,
    sourceId: string,
    apiKey: string,
    enabled: boolean
  ) {
    return withService(
      () =>
        keyPut<KnowledgeSource>(
          `/${projectId}/knowledge-sources/${sourceId}`,
          apiKey,
          { is_enabled: enabled }
        ),
      {
        successMessage: enabled ? "Source activée" : "Source désactivée",
      }
    );
  },

  /**
   * Supprime une source.
   */
  delete(projectId: string, sourceId: string, apiKey: string, name?: string) {
    return withService(
      () =>
        keyDel<{ status: string; deleted_id: string }>(
          `/${projectId}/knowledge-sources/${sourceId}`,
          apiKey
        ),
      { successMessage: name ? `Source "${name}" supprimée` : "Source supprimée" }
    );
  },

  /**
   * Teste une source (vérifie la connectivité et le format de réponse).
   */
  test(projectId: string, sourceId: string, apiKey: string) {
    return withService(
      () =>
        keyPost<KnowledgeSourceTestResult>(
          `/${projectId}/knowledge-sources/${sourceId}/test`,
          apiKey
        ),
      {
        showErrorToast: true,
        errorMessage: "Test de la source échoué",
      }
    );
  },
};
