/**
 * auth.service.ts
 * Gère login, signup, refresh, logout.
 * Login/refresh/logout passent par les API routes Next.js (/api/auth/*) qui
 * maintiennent le refresh_token dans un cookie HttpOnly — jamais lisible côté client.
 */

import { publicPost } from "@/lib/api/client";
import { tokenStore } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { ServiceResult } from "@/lib/api/result";
import type { UserResponse } from "@/types";

// ── Payloads ───────────────────────────────────────────────────────────────

export interface LoginPayload {
  username: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  password: string;
}

export interface PasswordResetPayload {
  token: string;
  new_password: string;
}

// ── Singleton refresh ──────────────────────────────────────────────────────
// Garantit qu'un seul appel /api/auth/refresh est en vol à la fois.
// Tous les appelants concurrents reçoivent la même Promise.

type RefreshResult = ServiceResult<{ access_token: string }>;
let _refreshInFlight: Promise<RefreshResult> | null = null;

// ── Service ────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Connexion — passe par /api/auth/login (Next.js) qui pose le cookie HttpOnly.
   * Retourne seulement l'access_token ; le refresh_token est opaque côté client.
   */
  async login(payload: LoginPayload) {
    const body = new URLSearchParams({
      username: payload.username,
      password: payload.password,
    });

    return withService(
      () =>
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(
              typeof err.detail === "string" ? err.detail : "Identifiants incorrects"
            );
          }
          const data: { access_token: string } = await res.json();
          tokenStore.set(data.access_token);
          return data;
        }),
      { errorMessage: undefined }
    );
  },

  /**
   * Inscription.
   */
  signup(payload: SignupPayload) {
    return withService(
      () => publicPost<UserResponse>("/auth/signup", payload),
      {
        successMessage: "Compte créé — en attente d'approbation.",
        errorMessage: undefined,
      }
    );
  },

  /**
   * Rafraîchit l'access_token via le cookie HttpOnly.
   * Singleton : si un refresh est déjà en cours, retourne la même Promise
   * au lieu de déclencher un second appel réseau.
   */
  refresh(): Promise<RefreshResult> {
    if (_refreshInFlight) return _refreshInFlight;

    _refreshInFlight = withService(
      () =>
        fetch("/api/auth/refresh", { method: "POST" }).then(async (res) => {
          if (!res.ok) throw new Error("Session expirée");
          const data: { access_token: string } = await res.json();
          tokenStore.set(data.access_token);
          return data;
        }),
      { showErrorToast: false }
    ).finally(() => { _refreshInFlight = null; });

    return _refreshInFlight;
  },

  /**
   * Déconnexion — efface le cookie HttpOnly et le token en mémoire.
   */
  async logout() {
    const accessToken = tokenStore.get();
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    }).catch(() => {});
    tokenStore.clear();
    return { ok: true as const, data: undefined, status: 200 };
  },

  /**
   * Demande d'email de réinitialisation.
   */
  forgotPassword(email: string) {
    return withService(
      () => publicPost<{ message: string }>("/auth/forgot-password", { email }),
      { successMessage: "Email de réinitialisation envoyé si le compte existe." }
    );
  },

  /**
   * Réinitialisation du mot de passe avec le token reçu par email.
   */
  resetPassword(payload: PasswordResetPayload) {
    return withService(
      () => publicPost<{ message: string }>("/auth/reset-password", payload),
      { successMessage: "Mot de passe réinitialisé avec succès." }
    );
  },

  /**
   * Vérification d'email via token.
   */
  verifyEmail(token: string) {
    return withService(
      () => publicPost<{ message: string }>("/auth/verify-email", { token }),
      { successMessage: "Email vérifié." }
    );
  },
};
