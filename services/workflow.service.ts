/**
 * workflow.service.ts
 * Project workflow settings, certification pipeline, runs, and rollout observability.
 * Auth : Bearer JWT.
 */

import { bearerGet, bearerPost, bearerPut } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  ProjectWorkflowConfiguration,
  WorkflowSettings,
  WorkflowSettingsUpsert,
  CapabilityCatalog,
  CapabilityCatalogUpsert,
  WorkflowCandidate,
  WorkflowCandidateCreate,
  WorkflowEvaluationPolicy,
  WorkflowEvaluationPolicyCreate,
  WorkflowEvaluationWindow,
  WorkflowEvaluationWindowCreate,
  WorkflowCertifiedPromotion,
  WorkflowCertification,
  WorkflowLegacyRetirement,
  CertifiedEvaluationReport,
  WorkflowEngineEvaluation,
  AgentRun,
  WorkflowRolloutObservability,
} from "@/types";

export const workflowService = {
  // ── Configuration ──────────────────────────────────────────────────────────

  /** Get full workflow configuration (settings + capability catalog). */
  getConfiguration(projectId: string) {
    return withService(
      () =>
        bearerGet<ProjectWorkflowConfiguration>(
          `/projects/${projectId}/workflow`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger la configuration workflow" }
    );
  },

  /** Update workflow settings (optimistic concurrency via expected_revision). */
  updateSettings(projectId: string, payload: WorkflowSettingsUpsert) {
    return withService(
      () =>
        bearerPut<WorkflowSettings>(
          `/projects/${projectId}/workflow/settings`,
          payload
        ),
      { successMessage: "Paramètres workflow mis à jour" }
    );
  },

  /** Update capability catalog (optimistic concurrency via expected_revision). */
  updateCapabilities(projectId: string, payload: CapabilityCatalogUpsert) {
    return withService(
      () =>
        bearerPut<CapabilityCatalog>(
          `/projects/${projectId}/workflow/capabilities`,
          payload
        ),
      { successMessage: "Catalogue de capacités mis à jour" }
    );
  },

  // ── Evaluation ─────────────────────────────────────────────────────────────

  /** Get canary evaluation metrics (non-authoritative). */
  getEvaluation(projectId: string) {
    return withService(
      () =>
        bearerGet<WorkflowEngineEvaluation>(
          `/projects/${projectId}/workflow/evaluation`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger l'évaluation" }
    );
  },

  // ── Certification pipeline ─────────────────────────────────────────────────

  /** Create a workflow candidate snapshot. */
  createCandidate(projectId: string, payload: WorkflowCandidateCreate) {
    return withService(
      () =>
        bearerPost<WorkflowCandidate>(
          `/projects/${projectId}/workflow/candidates`,
          payload
        ),
      { successMessage: "Candidat workflow créé" }
    );
  },

  /** List workflow candidates. */
  listCandidates(projectId: string, limit = 100) {
    return withService(
      () =>
        bearerGet<WorkflowCandidate[]>(
          `/projects/${projectId}/workflow/candidates?limit=${limit}`
        ),
      { showErrorToast: true }
    );
  },

  /** Create an evaluation policy. */
  createEvaluationPolicy(
    projectId: string,
    payload: WorkflowEvaluationPolicyCreate
  ) {
    return withService(
      () =>
        bearerPost<WorkflowEvaluationPolicy>(
          `/projects/${projectId}/workflow/evaluation-policies`,
          payload
        ),
      { successMessage: "Politique d'évaluation créée" }
    );
  },

  /** List evaluation policies. */
  listEvaluationPolicies(projectId: string, limit = 100) {
    return withService(
      () =>
        bearerGet<WorkflowEvaluationPolicy[]>(
          `/projects/${projectId}/workflow/evaluation-policies?limit=${limit}`
        ),
      { showErrorToast: true }
    );
  },

  /** Start an evaluation window (canary stage). */
  startEvaluationWindow(
    projectId: string,
    payload: WorkflowEvaluationWindowCreate
  ) {
    return withService(
      () =>
        bearerPost<WorkflowEvaluationWindow>(
          `/projects/${projectId}/workflow/evaluation-windows`,
          payload
        ),
      { successMessage: "Fenêtre d'évaluation démarrée" }
    );
  },

  /** Get evaluation window report. */
  getEvaluationWindowReport(projectId: string, windowId: string) {
    return withService(
      () =>
        bearerGet<CertifiedEvaluationReport>(
          `/projects/${projectId}/workflow/evaluation-windows/${windowId}`
        ),
      { showErrorToast: true }
    );
  },

  /** Advance evaluation window to next canary stage. */
  advanceEvaluationWindow(
    projectId: string,
    windowId: string,
    payload: WorkflowCertifiedPromotion
  ) {
    return withService(
      () =>
        bearerPost<WorkflowEvaluationWindow>(
          `/projects/${projectId}/workflow/evaluation-windows/${windowId}/advance`,
          payload
        ),
      { successMessage: "Stage canary avancé" }
    );
  },

  /** Promote evaluation window to certified active. */
  promoteEvaluationWindow(
    projectId: string,
    windowId: string,
    payload: WorkflowCertifiedPromotion
  ) {
    return withService(
      () =>
        bearerPost<WorkflowCertification>(
          `/projects/${projectId}/workflow/evaluation-windows/${windowId}/promote`,
          payload
        ),
      { successMessage: "Workflow certifié et promu en mode actif" }
    );
  },

  /** Retire legacy chat protocol. */
  retireLegacy(projectId: string, payload: WorkflowCertifiedPromotion) {
    return withService(
      () =>
        bearerPost<WorkflowLegacyRetirement>(
          `/projects/${projectId}/workflow/retire-legacy`,
          payload
        ),
      { successMessage: "Protocole legacy retiré" }
    );
  },

  // ── Runs & Observability ───────────────────────────────────────────────────

  /** List recent workflow engine runs. */
  listRuns(
    projectId: string,
    params: { limit?: number; status?: "completed" | "fallback" | "failed" } = {}
  ) {
    const { limit = 100, status } = params;
    const qs = new URLSearchParams({ limit: String(limit) });
    if (status) qs.set("status", status);
    return withService(
      () =>
        bearerGet<AgentRun[]>(
          `/projects/${projectId}/workflow/runs?${qs}`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les runs" }
    );
  },

  /** Get rollout observability dashboard data. */
  getRolloutObservability(projectId: string, limit = 100) {
    return withService(
      () =>
        bearerGet<WorkflowRolloutObservability>(
          `/projects/${projectId}/workflow/rollout-observability?limit=${limit}`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger l'observabilité" }
    );
  },
};
