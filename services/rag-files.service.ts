/**
 * rag-files.service.ts
 * Gestion des fichiers indexés (RAG) d'un projet.
 * Auth : X-API-Key (clé du projet).
 */

import { bearerGet, keyGet, keyDel, keyPost, keyPut, uploadRagFile } from "@/lib/api/client";
import type { UploadOptions } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import type {
  ProjectCacheListResponse,
  ProjectCacheScope,
  RagFile,
  RagFileContent,
  RagFileUpdateResponse,
} from "@/types";

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

  /** Lit le contenu texte d'un fichier RAG. */
  getContent(projectId: string, filename: string, apiKey: string) {
    return withService(
      () =>
        keyGet<RagFileContent>(
          `/projects/${projectId}/rag/files/${encodeURIComponent(filename)}/content`,
          apiKey
        ),
      { showErrorToast: true, errorMessage: "Impossible de lire le fichier" }
    );
  },

  /** Enregistre le contenu texte d'un fichier RAG et reconstruit l'index. */
  updateContent(projectId: string, filename: string, apiKey: string, content: string) {
    return withService(
      () =>
        keyPut<RagFileUpdateResponse>(
          `/projects/${projectId}/rag/files/${encodeURIComponent(filename)}/content`,
          apiKey,
          { content, rebuild: true }
        ),
      { successMessage: `Fichier "${filename}" mis à jour` }
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

  /** Liste les caches Redis project-scoped. */
  listCache(projectId: string, apiKey: string, scope: ProjectCacheScope = "all") {
    return withService(
      () =>
        keyGet<ProjectCacheListResponse>(
          `/projects/${projectId}/cache?scope=${scope}`,
          apiKey
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger les caches" }
    );
  },

  /** Modifie une entrée cache project-scoped. */
  updateCache(projectId: string, apiKey: string, key: string, value: unknown, ttlSeconds?: number | null) {
    return withService(
      () =>
        keyPut<{ status: string; key: string; scope: string; ttl_seconds: number }>(
          `/projects/${projectId}/cache`,
          apiKey,
          { key, value, ttl_seconds: ttlSeconds || undefined }
        ),
      { successMessage: "Cache modifié" }
    );
  },

  /** Supprime une entrée cache project-scoped. */
  deleteCache(projectId: string, apiKey: string, key: string) {
    return withService(
      () =>
        keyDel<{ status: string; deleted: boolean }>(
          `/projects/${projectId}/cache?key=${encodeURIComponent(key)}`,
          apiKey
        ),
      { successMessage: "Cache supprimé" }
    );
  },

  /** Purge un groupe de caches du projet. */
  purgeCacheScope(projectId: string, apiKey: string, scope: Exclude<ProjectCacheScope, "all">) {
    return withService(
      () =>
        keyDel<{ status: string; deleted: number }>(
          `/projects/${projectId}/cache/scope/${scope}`,
          apiKey
        ),
      { successMessage: "Caches purgés" }
    );
  },
};
