/**
 * activities.service.ts
 * Journal d'activité et notifications du compte.
 * Auth : Bearer JWT (utilisateur approuvé).
 */

import { bearerGet, bearerPost } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { ActivityListResponse } from "@/types";

export const activitiesService = {
  /**
   * Liste les activités avec filtres optionnels.
   */
  list(params: {
    project_id?: string;
    activity_type?: string;
    unread_only?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { project_id, activity_type, unread_only, page = 1, limit = 20 } = params;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (project_id)    qs.set("project_id", project_id);
    if (activity_type) qs.set("activity_type", activity_type);
    if (unread_only)   qs.set("unread_only", "true");
    return withService(
      () => bearerGet<ActivityListResponse>(`/activities?${qs}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les activités" }
    );
  },

  /**
   * Nombre d'activités non lues.
   */
  unreadCount(projectId?: string) {
    const qs = projectId ? `?project_id=${projectId}` : "";
    return withService(
      () => bearerGet<{ unread_count: number }>(`/activities/unread-count${qs}`),
      { showErrorToast: false }
    );
  },

  /**
   * Marque une activité comme lue ou non lue.
   */
  markRead(activityId: string, read = true) {
    return withService(
      () => bearerPost<{ marked_count: number; status: string }>(
        `/activities/${activityId}/read?read=${read}`
      ),
      { showErrorToast: false }
    );
  },

  /**
   * Marque toutes les activités comme lues.
   */
  markAllRead(projectId?: string) {
    const qs = projectId ? `?project_id=${projectId}` : "";
    return withService(
      () => bearerPost<{ marked_count: number; status: string }>(
        `/activities/mark-all-read${qs}`
      ),
      { successMessage: "Tout marqué comme lu" }
    );
  },
};
