import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ProjectAccessPage } from "@/components/projects/project-access-page";

export default function ProjectAccessRoute() {
  return (
    <DashboardLayout title="Acces projets">
      <ProjectAccessPage />
    </DashboardLayout>
  );
}
