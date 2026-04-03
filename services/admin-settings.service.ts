/**
 * admin-settings.service.ts
 * SMTP and global app settings management.
 * Auth: Bearer JWT (super_admin only).
 */

import { bearerGet, bearerPut, bearerPost } from "@/lib/api/client";
import { withService } from "@/lib/api/result";

export interface SmtpSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  support_email: string;
}

export interface DbAssistantVisibilitySettings {
  enabled: boolean;
  allow_global_tables: boolean;
  include_tables: string[];
  exclude_tables: string[];
  include_columns: string[];
  exclude_columns: string[];
}

export const adminSettingsService = {
  getSmtp() {
    return withService(
      () => bearerGet<SmtpSettings>("/admin/settings/smtp"),
      { showErrorToast: true, errorMessage: "Impossible de charger la configuration SMTP" },
    );
  },

  updateSmtp(payload: Partial<SmtpSettings>) {
    return withService(
      () => bearerPut<{ message: string; updated_keys: string[] }>("/admin/settings/smtp", payload),
      { successMessage: "Configuration SMTP mise à jour" },
    );
  },

  testSmtp() {
    return withService(
      () => bearerPost<{ message: string }>("/admin/settings/smtp/test"),
      { successMessage: "Email de test envoyé !" },
    );
  },

  getDbAssistantVisibility() {
    return withService(
      () => bearerGet<DbAssistantVisibilitySettings>("/admin/settings/db-assistant-visibility"),
      { showErrorToast: true, errorMessage: "Impossible de charger la visibilité DB assistant" },
    );
  },

  updateDbAssistantVisibility(payload: Partial<DbAssistantVisibilitySettings>) {
    return withService(
      () => bearerPut<{ message: string; settings: DbAssistantVisibilitySettings }>("/admin/settings/db-assistant-visibility", payload),
      { successMessage: "Visibilité DB assistant mise à jour" },
    );
  },
};
