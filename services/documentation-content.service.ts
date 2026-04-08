import { tokenStore } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import { normalizeDocumentationContent } from "@/lib/documentation/default-content";
import type { DocumentationContent } from "@/types";

interface DocumentationProxyResponse {
  section?: string;
  content?: unknown;
  updated_at?: string;
  detail?: string;
}

async function fetchDocumentationProxy(init?: RequestInit) {
  const res = await fetch("/api/documentation/content", init);
  const json = (await res.json().catch(() => null)) as DocumentationProxyResponse | null;
  if (!res.ok) throw new Error(json?.detail || "Erreur API documentation");
  return json;
}

export const documentationContentService = {
  getPublic() {
    return withService(
      async () => {
        const r = await fetchDocumentationProxy({ method: "GET" });
        return normalizeDocumentationContent(r?.content ?? r);
      },
      { showErrorToast: false }
    );
  },

  getAdmin() {
    return this.getPublic();
  },

  update(payload: DocumentationContent) {
    return withService(
      async () => {
        const token = tokenStore.get();
        const r = await fetchDocumentationProxy({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        return normalizeDocumentationContent(r?.content ?? r);
      },
      { successMessage: "Documentation mise a jour" }
    );
  },
};
