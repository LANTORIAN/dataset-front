/**
 * rag-files.service.ts
 * Gestion des fichiers indexés (RAG) d'un projet.
 * Auth : X-API-Key (clé du projet).
 */

import { bearerGet, keyGet, keyDel, keyPost, uploadRagFile } from "@/lib/api/client";
import type { UploadOptions } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type { RagFile } from "@/types";

// Types de fichiers acceptés par le backend
export const ACCEPTED_FILE_TYPES = ".pdf,.md,.txt,.docx,.html,.htm,.csv";
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Validation locale ──────────────────────────────────────────────────────

export function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const accepted = ACCEPTED_FILE_TYPES.split(",");
  if (!accepted.includes(ext)) {
    return `Type non supporté : ${ext}. Acceptés : ${ACCEPTED_FILE_TYPES}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum : ${MAX_FILE_SIZE_MB} MB`;
  }
  return null;
}

// ── Service ────────────────────────────────────────────────────────────────

export const ragFilesService = {
  /** Compte les fichiers d'un projet via Bearer JWT (sans clé API). */
  count(projectId: string) {
    return withService(
      () =>
        bearerGet<{ files: { filename: string; size_bytes: number }[] }>(
          `/projects/${projectId}/rag/files`
        ).then((data) => data.files.length),
      { showErrorToast: false }
    );
  },

  /** Liste tous les fichiers d'un projet. */
  list(projectId: string, apiKey: string) {
    return withService(
      () =>
        keyGet<{ files: { filename: string; size_bytes: number }[] }>(
          `/projects/${projectId}/rag/files`,
          apiKey
        ).then((data) =>
          data.files.map(
            (f): RagFile => ({
              id: f.filename,
              project_id: projectId,
              filename: f.filename,
              file_type: f.filename.split(".").pop() ?? "unknown",
              size_bytes: f.size_bytes ?? 0,
              status: "ready",
              chunks_count: null,
              error_message: null,
              uploaded_at: "",
            })
          )
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les fichiers" }
    );
  },

  /** Récupère les métadonnées d'un fichier par nom. */
  get(projectId: string, filename: string, apiKey: string) {
    return withService(
      () =>
        keyGet<RagFile>(
          `/projects/${projectId}/rag/files/${encodeURIComponent(filename)}`,
          apiKey
        ),
      { showErrorToast: true }
    );
  },

  /**
   * Upload un fichier avec progress.
   * Validation côté client avant envoi.
   */
  async upload(
    projectId: string,
    file: File,
    opts: UploadOptions
  ) {
    const validationError = validateFile(file);
    if (validationError) {
      const { toast } = await import("sonner");
      toast.error(validationError);
      return { ok: false as const, error: validationError, status: 400 };
    }

    return withService(
      () => uploadRagFile(projectId, file, opts),
      { successMessage: `"${file.name}" importé avec succès` }
    );
  },

  /** Supprime un fichier du projet par nom. */
  delete(projectId: string, filename: string, apiKey: string) {
    return withService(
      () =>
        keyDel<{ message: string }>(
          `/projects/${projectId}/rag/files/${encodeURIComponent(filename)}`,
          apiKey
        ),
      { successMessage: `Fichier "${filename}" supprimé` }
    );
  },

  /** Purge tous les fichiers du projet. */
  deleteAll(projectId: string, apiKey: string) {
    return withService(
      () =>
        keyDel<{ message: string }>(
          `/projects/${projectId}/rag/files`,
          apiKey
        ),
      { successMessage: "Tous les fichiers supprimés" }
    );
  },

  /** Reconstruction de l'index vectoriel. */
  rebuild(projectId: string, apiKey: string) {
    return withService(
      () =>
        keyPost<{ message: string; status: string }>(
          `/projects/${projectId}/rag/rebuild`,
          apiKey
        ),
      { successMessage: "Reconstruction de l'index lancée" }
    );
  },
};
