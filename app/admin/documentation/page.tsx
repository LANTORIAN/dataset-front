import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DocumentationAdminPage } from "@/components/admin/documentation-admin-page";
import { DEFAULT_DOCUMENTATION_CONTENT, normalizeDocumentationContent } from "@/lib/documentation/default-content";
import { headers } from "next/headers";

export default async function AdminDocumentation() {
  let initialContent = DEFAULT_DOCUMENTATION_CONTENT;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : "http://localhost:3000";

    const res = await fetch(`${origin}/api/documentation/content`, {
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
