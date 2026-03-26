// ── Typed API error ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Backend sends { detail: string | { msg: string }[] }
export async function parseApiError(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body?.detail)) {
      // FastAPI validation errors: [{ msg, loc, type }]
      message = body.detail.map((e: { msg: string }) => e.msg).join(", ");
    }
  } catch {
    // body is not JSON — keep status text
  }
  return new ApiError(message, res.status);
}

// Human-readable label for HTTP status codes
export function httpStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    400: "Requête invalide",
    401: "Non authentifié",
    403: "Accès refusé",
    404: "Ressource introuvable",
    409: "Conflit de données",
    422: "Données invalides",
    429: "Trop de requêtes",
    500: "Erreur serveur",
    502: "Serveur indisponible",
    503: "Service indisponible",
  };
  return labels[status] ?? `Erreur ${status}`;
}
