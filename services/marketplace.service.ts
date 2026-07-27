/**
 * marketplace.service.ts
 * CRUD modules marketplace : project-scoped + admin (system-level).
 * Auth : Bearer JWT.
 */

import { bearerGet, bearerPost, bearerDel } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  MarketplaceModule,
  MarketplaceModuleUpsert,
  MarketplaceModuleListResponse,
  MarketplaceSeedResponse,
} from "@/types";

export const marketplaceService = {
  // ── Project-scoped ─────────────────────────────────────────────────────────

  /** List effective marketplace modules for a project (merged view). */
  listModules(projectId: string) {
    return withService(
      () =>
        bearerGet<MarketplaceModuleListResponse>(
          `/projects/${projectId}/marketplace/modules`
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les modules marketplace" }
    );
  },

  /** Create or update a project-scoped marketplace module. */
  upsertModule(projectId: string, payload: MarketplaceModuleUpsert) {
    return withService(
      () =>
        bearerPost<MarketplaceModule>(
          `/projects/${projectId}/marketplace/modules`,
          payload
        ),
      { successMessage: `Module "${payload.name}" enregistré` }
    );
  },

  /** Remove a project-scoped marketplace module override. */
  deleteModule(projectId: string, moduleId: string) {
    return withService(
      () =>
        bearerDel<void>(
          `/projects/${projectId}/marketplace/modules/${moduleId}`
        ),
      { successMessage: "Module marketplace supprimé" }
    );
  },

  // ── Admin (system-level) ───────────────────────────────────────────────────

  /** List system-level marketplace module defaults (super_admin only). */
  listSystemModules() {
    return withService(
      () =>
        bearerGet<MarketplaceModuleListResponse>(
          "/admin/marketplace/modules"
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les modules système" }
    );
  },

  /** Create or update a system-level marketplace module (super_admin only). */
  upsertSystemModule(payload: MarketplaceModuleUpsert) {
    return withService(
      () =>
        bearerPost<MarketplaceModule>(
          "/admin/marketplace/modules",
          payload
        ),
      { successMessage: `Module système "${payload.name}" enregistré` }
    );
  },

  /** Delete a system-level marketplace module (super_admin only). */
  deleteSystemModule(moduleId: string) {
    return withService(
      () => bearerDel<void>(`/admin/marketplace/modules/${moduleId}`),
      { successMessage: "Module système supprimé" }
    );
  },

  /** Seed hardcoded marketplace module defaults into DB (idempotent, super_admin only). */
  seedSystemModules() {
    return withService(
      () =>
        bearerPost<MarketplaceSeedResponse>(
          "/admin/marketplace/modules/seed"
        ),
      { successMessage: "Modules marketplace initialisés" }
    );
  },
};
