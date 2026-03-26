/**
 * admin.service.ts
 * Gestion des utilisateurs (liste, approbation, rôle, suppression).
 * Auth : Bearer JWT — super_admin uniquement.
 */

import { bearerGet, bearerPost, bearerDel } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { UserResponse, UserRole } from "@/types";

export interface UserListAdminResponse {
  users: UserResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApproveUserPayload {
  approved: boolean;
  reason?: string;
}

export const adminService = {
  /** Liste tous les utilisateurs avec filtres optionnels. */
  listUsers(params: {
    page?: number;
    page_size?: number;
    role?: UserRole | "";
    is_approved?: boolean;
    search?: string;
  } = {}) {
    const { page = 1, page_size = 20, role, is_approved, search } = params;
    const qs = new URLSearchParams({ page: String(page), page_size: String(page_size) });
    if (role) qs.set("role", role);
    if (is_approved !== undefined) qs.set("is_approved", String(is_approved));
    if (search) qs.set("search", search);
    return withService(
      () => bearerGet<UserListAdminResponse>(`/admin/users?${qs}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les utilisateurs" }
    );
  },

  /** Liste les utilisateurs en attente d'approbation. */
  listPending(page = 1, page_size = 20) {
    const qs = new URLSearchParams({ page: String(page), page_size: String(page_size) });
    return withService(
      () => bearerGet<UserListAdminResponse>(`/admin/users/pending?${qs}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les demandes en attente" }
    );
  },

  /** Approuve ou rejette un compte utilisateur. */
  approveUser(userId: string, payload: ApproveUserPayload) {
    return withService(
      () => bearerPost<UserResponse>(`/admin/users/${userId}/approve`, payload),
      {
        successMessage: payload.approved
          ? "Utilisateur approuvé"
          : "Utilisateur rejeté",
      }
    );
  },

  /** Change le rôle d'un utilisateur. */
  changeRole(userId: string, role: UserRole) {
    return withService(
      () => bearerPost<UserResponse>(`/admin/users/${userId}/role`, { role }),
      { successMessage: `Rôle mis à jour` }
    );
  },

  /** Supprime un compte utilisateur (irréversible). */
  deleteUser(userId: string) {
    return withService(
      () => bearerDel<void>(`/admin/users/${userId}`),
      { successMessage: "Utilisateur supprimé" }
    );
  },

  /** Crée un utilisateur directement (admin). */
  createUser(payload: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    role?: UserRole;
    is_approved?: boolean;
  }) {
    return withService(
      () => bearerPost<UserResponse>("/admin/users", payload),
      { successMessage: "Utilisateur créé" }
    );
  },
};
