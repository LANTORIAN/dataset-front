import { bearerGet, bearerPut, publicGet } from "@/lib/api/client";
import { withService } from "@/lib/api/result";
import { normalizeDocumentationContent } from "@/lib/documentation/default-content";
import type { DocumentationContent } from "@/types";

interface SupportSectionResponse {
  section: string;
  content: unknown;
  updated_at: string;
}

const SECTION = "documentation";

export const documentationContentService = {
  getPublic() {
    return withService(
      () =>
        publicGet<SupportSectionResponse>(`/support/content/${SECTION}`).then((r) =>
          normalizeDocumentationContent(r.content)
        ),
      { showErrorToast: false }
    );
  },

  getAdmin() {
    return withService(
      () =>
        bearerGet<SupportSectionResponse>(`/support/content/${SECTION}`).then((r) =>
          normalizeDocumentationContent(r.content)
        ),
      { showErrorToast: true, errorMessage: "Impossible de charger le contenu de la documentation" }
    );
  },

  update(payload: DocumentationContent) {
    return withService(
      () =>
        bearerPut<SupportSectionResponse>(`/admin/support/content/${SECTION}`, {
          content: payload,
        }).then((r) => normalizeDocumentationContent(r.content)),
      { successMessage: "Documentation mise a jour" }
    );
  },
};
