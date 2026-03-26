import { toast } from "sonner";
import { ApiError, httpStatusLabel } from "./errors";

// ── ServiceResult ──────────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

// ── withService ────────────────────────────────────────────────────────────
// Wraps an async operation:
//  - Catches ApiError and unknown errors
//  - Shows toasts (opt-in per-call)
//  - Returns a typed ServiceResult (never throws)

interface ServiceOptions {
  /** Toast message on success. Omit to skip the success toast. */
  successMessage?: string;
  /** Override the error message shown in the toast. */
  errorMessage?: string;
  /** Set false to suppress the error toast (default: true). */
  showErrorToast?: boolean;
}

export async function withService<T>(
  fn: () => Promise<T>,
  options: ServiceOptions = {}
): Promise<ServiceResult<T>> {
  const { successMessage, errorMessage, showErrorToast = true } = options;

  try {
    const data = await fn();

    if (successMessage) {
      toast.success(successMessage);
    }

    return { ok: true, data, status: 200 };
  } catch (err) {
    const isApiError = err instanceof ApiError;
    const status = isApiError ? err.status : 0;
    const rawMessage = isApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Une erreur inattendue est survenue";

    const displayMessage =
      errorMessage ??
      (isApiError && status > 0
        ? `${httpStatusLabel(status)} — ${rawMessage}`
        : rawMessage);

    if (showErrorToast) {
      toast.error(displayMessage);
    }

    return { ok: false, error: displayMessage, status };
  }
}
