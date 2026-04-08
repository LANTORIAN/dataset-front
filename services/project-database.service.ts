import { bearerDel, bearerGet, bearerPost, bearerPut } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  ProjectDatabaseConfig,
  ProjectDatabaseTestResult,
  UpsertProjectDatabaseConfigPayload,
} from "@/types";

export const projectDatabaseService = {
  get(projectId: string) {
    return withService(
      () => bearerGet<ProjectDatabaseConfig>(`/projects/${projectId}/database-config`),
      { showErrorToast: false }
    );
  },

  upsert(projectId: string, payload: UpsertProjectDatabaseConfigPayload) {
    return withService(
      () =>
        bearerPut<ProjectDatabaseConfig>(
          `/projects/${projectId}/database-config`,
          payload
        ),
      { successMessage: "Configuration DB enregistrée" }
    );
  },

  test(projectId: string) {
    return withService(
      () =>
        bearerPost<ProjectDatabaseTestResult>(
          `/projects/${projectId}/database-config/test`
        ),
      {
        successMessage: "Connexion DB validée",
        errorMessage: "Test de connexion DB échoué",
      }
    );
  },

  remove(projectId: string) {
    return withService(
      () => bearerDel<{ status: "ok" }>(`/projects/${projectId}/database-config`),
      { successMessage: "Configuration DB supprimée" }
    );
  },
};
