import { parseApiError } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";

function apiBaseFor(version: "v1" | "v2"): string {
  return version === "v2"
    ? `${API_BASE.replace(/\/v1\/?$/, "")}/v2`
    : API_BASE;
}

// ── In-memory token store ──────────────────────────────────────────────────
//
// Access token  : stocké en mémoire (variable module).
//   - Effacé au rechargement de page → sécurisé contre le vol XSS persistent.
//   - Restauré via refresh au prochain mount (cookie HttpOnly côté serveur).
//
// Refresh token : géré UNIQUEMENT côté serveur dans un cookie HttpOnly via
//   /api/auth/{login|refresh|logout}. Jamais lisible par JavaScript.
//
let _accessToken: string | null = null;
let _authExpiryTimer: number | null = null;

function clearAuthExpiryTimer() {
  if (_authExpiryTimer !== null) {
    window.clearTimeout(_authExpiryTimer);
    _authExpiryTimer = null;
  }
}

function getJwtExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const tokenStore = {
  get:        ()           => _accessToken,
  set:        (t: string)  => {
    _accessToken = t;
    _authExpiredNotified = false;
    if (typeof window !== "undefined") {
      clearAuthExpiryTimer();
      const expiresAt = getJwtExpiryMs(t);
      if (expiresAt) {
        const delay = expiresAt - Date.now();
        if (delay <= 0) {
          notifyAuthExpired();
        } else {
          _authExpiryTimer = window.setTimeout(() => {
            notifyAuthExpired();
          }, delay);
        }
      }
    }
  },
  clear:      ()           => {
    _accessToken = null;
    if (typeof window !== "undefined") clearAuthExpiryTimer();
  },
  // Stubs — refresh token est dans le cookie HttpOnly, non accessible client
  getRefresh: ()           => null as string | null,
  setRefresh: ()           => { /* géré côté serveur */ },
};

// ── Auth modes ─────────────────────────────────────────────────────────────

type AuthMode =
  | { type: "bearer" }               // JWT in-memory
  | { type: "api-key"; key: string } // project X-API-Key header
  | { type: "none" };                // public endpoint

let _refreshInFlight: Promise<boolean> | null = null;
let _authExpiredNotified = false;

export const AUTH_EXPIRED_EVENT = "auth:expired";

function notifyAuthExpired() {
  if (typeof window === "undefined") return;
  if (_authExpiredNotified) return;
  _authExpiredNotified = true;
  tokenStore.clear();
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (_refreshInFlight) return _refreshInFlight;

  _refreshInFlight = fetch("/api/auth/refresh", { method: "POST" })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = await res.json().catch(() => null) as { access_token?: string } | null;
      if (!data?.access_token) return false;
      tokenStore.set(data.access_token);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      _refreshInFlight = null;
    });

  return _refreshInFlight;
}

async function parseResponseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return res.text() as unknown as T;
}

function buildAuthHeaders(auth: AuthMode): Record<string, string> {
  const token = tokenStore.get();

  if (auth.type === "bearer") {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  if (auth.type === "api-key") {
    return {
      "X-API-Key": auth.key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }
  return {};
}

// ── Core fetch ─────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: AuthMode;
  headers?: Record<string, string>;
  raw?: boolean;
  apiVersion?: "v1" | "v2";
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = { type: "bearer" },
    headers = {},
    raw = false,
    apiVersion = "v1",
  } = options;

  const requestHeaders: Record<string, string> = {
    ...(!raw && body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...buildAuthHeaders(auth),
    ...headers,
  };

  const init: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    init.body = raw ? (body as BodyInit) : JSON.stringify(body);
  }

  if (auth.type !== "none" && !tokenStore.get()) {
    await tryRefreshAccessToken();
    Object.assign(requestHeaders, buildAuthHeaders(auth));
  }

  const apiBase = apiBaseFor(apiVersion);
  let res = await fetch(`${apiBase}${path}`, init);

  if (!res.ok && auth.type === "bearer" && res.status === 401) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      Object.assign(requestHeaders, buildAuthHeaders(auth));
      res = await fetch(`${apiBase}${path}`, init);
    } else {
      notifyAuthExpired();
    }
  }

  if (!res.ok && auth.type === "bearer" && res.status === 401) {
    notifyAuthExpired();
  }

  if (!res.ok) throw await parseApiError(res);
  return parseResponseBody<T>(res);
}

// ── Bearer (JWT) helpers ───────────────────────────────────────────────────

export const bearerGet   = <T>(path: string)                 => apiFetch<T>(path);
export const bearerPost  = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST",  body });
export const bearerPut   = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT",   body });
export const bearerPatch = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body });
export const bearerDel   = <T>(path: string)                 => apiFetch<T>(path, { method: "DELETE" });

// ── X-API-Key (project key) helpers ───────────────────────────────────────

export const keyGet  = <T>(path: string, k: string)                 => apiFetch<T>(path, { auth: { type: "api-key", key: k } });
export const keyGetV2 = <T>(path: string, k: string) => apiFetch<T>(path, { auth: { type: "api-key", key: k }, apiVersion: "v2" });
export const keyPost = <T>(path: string, k: string, body?: unknown) => apiFetch<T>(path, { method: "POST",   body, auth: { type: "api-key", key: k } });
export const keyPostV2 = <T>(path: string, k: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body, auth: { type: "api-key", key: k }, apiVersion: "v2" });

const publicChatV2Readiness = new Map<string, { value: boolean; expiresAt: number }>();

export async function probePublicChatV2(
  apiKey: string,
  signal?: AbortSignal
): Promise<boolean> {
  const cached = publicChatV2Readiness.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`${apiBaseFor("v2")}/chat/readiness`, {
    method: "GET",
    headers: { "X-API-Key": apiKey },
    signal,
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) throw await parseApiError(response);
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (
    body?.schema_version !== "chat.readiness.v1" ||
    typeof body.can_accept_v2 !== "boolean"
  ) {
    throw new Error("Readiness publique v2 invalide");
  }
  const available = body.can_accept_v2;
  publicChatV2Readiness.set(apiKey, {
    value: available,
    expiresAt: Date.now() + (available ? 15_000 : 5_000),
  });
  return available;
}

export const keyPut  = <T>(path: string, k: string, body?: unknown) => apiFetch<T>(path, { method: "PUT",    body, auth: { type: "api-key", key: k } });
export const keyDel  = <T>(path: string, k: string)                 => apiFetch<T>(path, { method: "DELETE",       auth: { type: "api-key", key: k } });

// ── Public (no auth) helpers ───────────────────────────────────────────────

export const publicGet  = <T>(path: string)                 => apiFetch<T>(path, { auth: { type: "none" } });
export const publicPost = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body, auth: { type: "none" } });

// ── File upload with progress ──────────────────────────────────────────────

export interface UploadOptions {
  apiKey: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function uploadRagFile(projectId: string, file: File, opts: UploadOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/projects/${projectId}/rag/files`);
    xhr.setRequestHeader("X-API-Key", opts.apiKey);

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) opts.onProgress!(Math.round((e.loaded / e.total) * 100));
      };
    }
    if (opts.signal) opts.signal.addEventListener("abort", () => xhr.abort());

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); }
      } else {
        if (xhr.status === 401) notifyAuthExpired();
        let msg = `Upload échoué (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.detail) msg = typeof body.detail === "string" ? body.detail : msg;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload"));
    xhr.onabort = () => reject(new Error("Upload annulé"));
    xhr.send(formData);
  });
}

// ── SSE streaming (fetch POST — EventSource ne supporte pas POST) ──────────

export interface StreamOptions {
  message: string;
  apiKey: string;
  conversationId?: string;
  sessionId?: string;
  requestId?: string;
  contractVersion?: "v1" | "v2";
  clarificationResponse?: unknown;
}

export interface ChatStreamCallbacks {
  /** Called for each SSE event with its named type and raw data string. */
  onEvent: (eventName: string, data: string) => void;
  onError: () => void;
  onHttpError?: (status: number, body: unknown) => void;
  onEnd?: () => void;
}

export function createChatStream(
  opts: StreamOptions,
  callbacks: ChatStreamCallbacks
): { stop: () => void } {
  const controller = new AbortController();

  const contractVersion = opts.contractVersion ?? "v1";
  const body: Record<string, unknown> = { message: opts.message };
  if (opts.conversationId) body.conversation_id = opts.conversationId;
  if (opts.sessionId)      body.session_id      = opts.sessionId;
  if (opts.requestId)      body.request_id      = opts.requestId;
  if (opts.clarificationResponse) {
    body.clarification_response = opts.clarificationResponse;
  }
  if (contractVersion === "v2") body.schema_version = "chat.request.v2";

  const apiBase = apiBaseFor(contractVersion);

  fetch(`${apiBase}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        if (res.status === 401) notifyAuthExpired();
        let responseBody: unknown = null;
        try {
          responseBody = await res.json();
        } catch {
          responseBody = null;
        }
        if (callbacks.onHttpError) {
          callbacks.onHttpError(res.status, responseBody);
        } else {
          callbacks.onError();
        }
        return;
      }
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      // Parse SSE properly: accumulate full events (separated by blank lines)
      let currentEvent = "message";
      let currentData  = "";

      const dispatch = () => {
        if (currentData) callbacks.onEvent(currentEvent, currentData);
        currentEvent = "message";
        currentData  = "";
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          decoder.decode();
          callbacks.onEnd?.();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
          if (line === "") {
            dispatch(); // blank line = end of event block
          } else if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const value = line.slice(5).replace(/^ /, "");
            currentData += `${currentData ? "\n" : ""}${value}`;
          }
        }
      }
    })
    .catch(() => {
      if (!controller.signal.aborted) callbacks.onError();
    });

  return { stop: () => controller.abort() };
}
