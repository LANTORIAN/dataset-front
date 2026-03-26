/**
 * support.service.ts
 * Support page content + contact form + admin ticket management.
 * Contact form: public (no auth).
 * Admin endpoints: Bearer JWT.
 */

import { bearerGet, bearerPatch } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { SupportTicket, SupportContent, CreateTicketPayload, UpdateTicketPayload } from "@/types";

export interface TicketListResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";

export const supportService = {
  /** Page content (hero, faq, contact_info). Public. */
  getContent() {
    return withService(
      () => fetch(`${API_BASE}/support/content`).then((r) => r.json() as Promise<SupportContent>),
      { showErrorToast: false }
    );
  },

  /** Submit a contact/support ticket. Public — no auth required. */
  create(payload: CreateTicketPayload) {
    return withService(
      () =>
        fetch(`${API_BASE}/support/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ detail: r.statusText }));
            throw new Error(typeof err.detail === "string" ? err.detail : "Erreur lors de l'envoi");
          }
          return r.json() as Promise<{ ticket_id: string; message: string }>;
        }),
      { successMessage: "Votre message a été envoyé. Nous vous répondrons rapidement." }
    );
  },

  /** List all tickets — admin only (Bearer JWT). */
  listAll(params: { status?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.page)   qs.set("page",   String(params.page));
    if (params.limit)  qs.set("limit",  String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return withService(
      () => bearerGet<TicketListResponse>(`/admin/support/tickets${query}`),
      { showErrorToast: true, errorMessage: "Impossible de charger les tickets" }
    );
  },

  /** Update ticket status / add admin note — admin only (Bearer JWT). */
  update(ticketId: string, payload: UpdateTicketPayload) {
    return withService(
      () => bearerPatch<SupportTicket>(`/admin/support/tickets/${ticketId}`, payload),
      { successMessage: "Ticket mis à jour" }
    );
  },
};
