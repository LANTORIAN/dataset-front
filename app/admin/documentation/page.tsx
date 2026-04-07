import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DocumentationAdminPage } from "@/components/admin/documentation-admin-page";
import { DEFAULT_DOCUMENTATION_CONTENT, normalizeDocumentationContent } from "@/lib/documentation/default-content";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";

export default async function AdminDocumentation() {
  let initialContent = DEFAULT_DOCUMENTATION_CONTENT;

  try {
    const res = await fetch(`${API_BASE}/support/content/documentation`, {
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const json = await res.json();
      initialContent = normalizeDocumentationContent(json?.content ?? json);
    }
  } catch {
    initialContent = DEFAULT_DOCUMENTATION_CONTENT;
  }

  return (
    <DashboardLayout title="Administration - Documentation">
      <DocumentationAdminPage initialContent={initialContent} />
    </DashboardLayout>
  );
}
