import { bearerGet, bearerPost, bearerPut } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  ProjectLLMSettingsResponse,
  ProjectLLMTestResponse,
  UpsertProjectLLMProviderPayload,
  UpsertProjectLLMSettingsPayload,
} from "@/types";

export const projectLLMService = {
  getSettings(projectId: string) {
    return withService(
      () => bearerGet<ProjectLLMSettingsResponse>(`/projects/${projectId}/llm-settings`),
      { showErrorToast: false }
    );
  },

  updateSettings(projectId: string, payload: UpsertProjectLLMSettingsPayload) {
    return withService(
      () =>
        bearerPut<ProjectLLMSettingsResponse>(
          `/projects/${projectId}/llm-settings`,
          payload
        ),
      { successMessage: "Configuration LLM enregistrée" }
    );
  },

  testProvider(projectId: string, payload: UpsertProjectLLMProviderPayload) {
    return withService(
      () =>
        bearerPost<ProjectLLMTestResponse>(
          `/projects/${projectId}/llm-settings/test`,
          payload
        ),
      { successMessage: "Provider LLM testé" }
    );
  },
};
