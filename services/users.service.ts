/**
 * users.service.ts
 * Profil utilisateur, changement de mot de passe, consentements RGPD, export.
 * Auth : Bearer JWT.
 */

import { bearerGet, bearerPost, bearerDel } from "@/lib/api/client";
import { tokenStore } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { UserResponse, ConsentResponse } from "@/types";

export interface UpdateProfilePayload {
  email?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export type ConsentType = "terms" | "privacy" | "marketing" | "analytics";

export const usersService = {
  /**
   * Récupère le profil de l'utilisateur connecté.
   */
  me() {
    return withService(
      () => bearerGet<UserResponse>("/users/me"),
      { showErrorToast: true, errorMessage: "Impossible de charger le profil" }
    );
  },

  /**
   * Met à jour les infos du profil.
   */
  updateProfile(payload: UpdateProfilePayload) {
    return withService(
      () => bearerPost<UserResponse>("/users/me/update", payload),
      { successMessage: "Profil mis à jour" }
    );
  },

  /**
   * Change le mot de passe.
   * Vérification longueur min faite côté client avant l'appel.
   */
  changePassword(payload: ChangePasswordPayload) {
    if (payload.new_password.length < 8) {
      return Promise.resolve({
        ok: false as const,
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères",
        status: 400,
      });
    }
    return withService(
      () =>
        bearerPost<{ message: string }>("/users/me/change-password", payload),
      { successMessage: "Mot de passe modifié avec succès" }
    );
  },

  /**
   * Renvoie l'email de vérification.
   */
  resendVerification() {
    return withService(
      () => bearerPost<{ message: string }>("/users/me/resend-verification"),
      { successMessage: "Email de vérification renvoyé" }
    );
  },

  /**
   * Export RGPD des données personnelles.
   */
  exportData() {
    return withService(
      () => bearerGet<unknown>("/users/me/export"),
      {
        successMessage: "Export prêt",
        errorMessage: "Impossible de générer l'export",
      }
    );
  },

  /**
   * Supprime le compte (irréversible).
   * Efface les tokens locaux si succès.
   */
  async deleteAccount(password: string) {
    const result = await withService(
      () =>
        bearerDel<{ message: string }>(
          `/me?password=${encodeURIComponent(password)}`
        ),
      { successMessage: "Compte supprimé" }
    );
    if (result.ok) tokenStore.clear();
    return result;
  },

  // ── Consentements RGPD ────────────────────────────────────────────────────

  /**
   * Enregistre un consentement.
   */
  addConsent(consentType: ConsentType, accepted: boolean) {
    return withService(
      () =>
        bearerPost<ConsentResponse>("/users/me/consents", {
          consent_type: consentType,
          accepted,
        }),
      { successMessage: accepted ? "Consentement enregistré" : "Consentement retiré" }
    );
  },

  /**
   * Liste tous les consentements de l'utilisateur.
   */
  listConsents() {
    return withService(
      () => bearerGet<ConsentResponse[]>("/users/me/consents"),
      { showErrorToast: false }
    );
  },
};
