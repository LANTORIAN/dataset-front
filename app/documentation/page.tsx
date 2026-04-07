import dynamic from "next/dynamic";
import { DEFAULT_DOCUMENTATION_CONTENT, normalizeDocumentationContent } from "@/lib/documentation/default-content";
import type { DocumentationContent } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";

const DocumentationPage = dynamic<{ content: DocumentationContent }>(
  () =>
    import("@/components/documentation/documentation-page").then(
      (mod) => mod.DocumentationPage
    ),
  {
    loading: () => <div className="space-y-6"><div className="h-40 rounded-2xl border border-border doc-skeleton-shimmer" /><div className="h-72 rounded-2xl border border-border doc-skeleton-shimmer" /><div className="h-72 rounded-2xl border border-border doc-skeleton-shimmer" /></div>,
  }
);

export default function DocumentationRoute() {
  return <DocumentationContentLoader />;
}

async function DocumentationContentLoader() {
  let content = DEFAULT_DOCUMENTATION_CONTENT;

  try {
    const res = await fetch(`${API_BASE}/support/content/documentation`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      content = normalizeDocumentationContent(json?.content ?? json);
    }
  } catch {
    content = DEFAULT_DOCUMENTATION_CONTENT;
  }

  return <DocumentationPage content={content} />;
}
