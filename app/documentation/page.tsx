import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { DEFAULT_DOCUMENTATION_CONTENT, normalizeDocumentationContent } from "@/lib/documentation/default-content";
import type { DocumentationContent } from "@/types";

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
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : "http://localhost:3000";

    const res = await fetch(`${origin}/api/documentation/content`, {
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
