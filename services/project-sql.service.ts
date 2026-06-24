import { bearerDel, bearerGet, bearerPost, bearerPut } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  CreateProjectSqlAliasPayload,
  CreateProjectSqlExamplePayload,
  ProjectSchemaCache,
  ProjectSqlAgentSettings,
  ProjectSqlAlias,
  ProjectSqlAliasListResponse,
  ProjectSqlExample,
  ProjectSqlExampleListResponse,
  UpsertProjectSqlAgentSettingsPayload,
} from "@/types";

export const projectSqlService = {
  getSettings(projectId: string) {
    return withService(
      () => bearerGet<ProjectSqlAgentSettings>(`/projects/${projectId}/sql-agent/settings`),
      { showErrorToast: false }
    );
  },

  upsertSettings(projectId: string, payload: UpsertProjectSqlAgentSettingsPayload) {
    return withService(
      () =>
        bearerPut<ProjectSqlAgentSettings>(
          `/projects/${projectId}/sql-agent/settings`,
          payload
        ),
      { successMessage: "Paramètres SQL agent enregistrés" }
    );
  },

  listAliases(projectId: string) {
    return withService(
      () => bearerGet<ProjectSqlAliasListResponse>(`/projects/${projectId}/sql-agent/aliases`),
      { showErrorToast: false }
    );
  },

  createAlias(projectId: string, payload: CreateProjectSqlAliasPayload) {
    return withService(
      () => bearerPost<ProjectSqlAlias>(`/projects/${projectId}/sql-agent/aliases`, payload),
      { successMessage: "Alias SQL ajouté" }
    );
  },

  deleteAlias(projectId: string, aliasId: string) {
    return withService(
      () => bearerDel<void>(`/projects/${projectId}/sql-agent/aliases/${aliasId}`),
      { successMessage: "Alias SQL supprimé" }
    );
  },

  listExamples(projectId: string, activeOnly = false) {
    return withService(
      () =>
        bearerGet<ProjectSqlExampleListResponse>(
          `/projects/${projectId}/sql-agent/examples?active_only=${activeOnly ? "true" : "false"}`
        ),
      { showErrorToast: false }
    );
  },

  createExample(projectId: string, payload: CreateProjectSqlExamplePayload) {
    return withService(
      () => bearerPost<ProjectSqlExample>(`/projects/${projectId}/sql-agent/examples`, payload),
      { successMessage: "Exemple SQL ajouté" }
    );
  },

  deleteExample(projectId: string, exampleId: string) {
    return withService(
      () => bearerDel<void>(`/projects/${projectId}/sql-agent/examples/${exampleId}`),
      { successMessage: "Exemple SQL supprimé" }
    );
  },

  recordExampleFeedback(projectId: string, exampleId: string, success: boolean) {
    return withService(
      () =>
        bearerPost<ProjectSqlExample>(
          `/projects/${projectId}/sql-agent/examples/${exampleId}/feedback?success=${success ? "true" : "false"}`
        ),
      { successMessage: success ? "Succès enregistré" : "Échec enregistré" }
    );
  },

  getSchemaCache(projectId: string) {
    return withService(
      () => bearerGet<ProjectSchemaCache>(`/projects/${projectId}/sql-agent/schema-cache`),
      { showErrorToast: false }
    );
  },

  refreshSchemaCache(projectId: string) {
    return withService(
      () => bearerPost<ProjectSchemaCache>(`/projects/${projectId}/sql-agent/schema-cache/refresh`),
      { successMessage: "Cache de schéma rafraîchi" }
    );
  },

  deleteSchemaCache(projectId: string) {
    return withService(
      () => bearerDel<void>(`/projects/${projectId}/sql-agent/schema-cache`),
      { successMessage: "Cache de schéma supprimé" }
    );
  },
};
