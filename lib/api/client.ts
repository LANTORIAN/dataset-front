import { parseApiError } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";

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

export const tokenStore = {
  get:        ()           => _accessToken,
  set:        (t: string)  => { _accessToken = t; },
  clear:      ()           => { _accessToken = null; },
  // Stubs — refresh token est dans le cookie HttpOnly, non accessible client
  getRefresh: ()           => null as string | null,
  setRefresh: ()           => { /* géré côté serveur */ },
};

// ── Auth modes ─────────────────────────────────────────────────────────────

type AuthMode =
  | { type: "bearer" }               // JWT in-memory
  | { type: "api-key"; key: string } // project X-API-Key header
  | { type: "none" };                // public endpoint

function buildAuthHeaders(auth: AuthMode): Record<string, string> {
  if (auth.type === "bearer") {
    const token = tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  if (auth.type === "api-key") {
    return { "X-API-Key": auth.key };
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
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = { type: "bearer" }, headers = {}, raw = false } = options;

  const init: RequestInit = {
    method,
    headers: {
      ...(!raw && body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...buildAuthHeaders(auth),
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = raw ? (body as BodyInit) : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);

  if (!res.ok) throw await parseApiError(res);
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Bearer (JWT) helpers ───────────────────────────────────────────────────

export const bearerGet   = <T>(path: string)                 => apiFetch<T>(path);
export const bearerPost  = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST",  body });
export const bearerPut   = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT",   body });
export const bearerPatch = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body });
export const bearerDel   = <T>(path: string)                 => apiFetch<T>(path, { method: "DELETE" });

// ── X-API-Key (project key) helpers ───────────────────────────────────────

export const keyGet  = <T>(path: string, k: string)                 => apiFetch<T>(path, { auth: { type: "api-key", key: k } });
export const keyPost = <T>(path: string, k: string, body?: unknown) => apiFetch<T>(path, { method: "POST",   body, auth: { type: "api-key", key: k } });
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
}

export interface ChatStreamCallbacks {
  /** Called for each SSE event with its named type and raw data string. */
  onEvent: (eventName: string, data: string) => void;
  onError: () => void;
}

export function createChatStream(
  opts: StreamOptions,
  callbacks: ChatStreamCallbacks
): { stop: () => void } {
  const controller = new AbortController();

  const body: Record<string, unknown> = { message: opts.message };
  if (opts.conversationId) body.conversation_id = opts.conversationId;
  if (opts.sessionId)      body.session_id      = opts.sessionId;

  fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) { callbacks.onError(); return; }
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
        if (done) { dispatch(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line === "") {
            dispatch(); // blank line = end of event block
          } else if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          }
        }
      }
    })
    .catch(() => {
      if (!controller.signal.aborted) callbacks.onError();
    });

  return { stop: () => controller.abort() };
}
