import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ProjectsPage } from "@/components/projects/projects-page";

export default function Projects() {
  return (
    <DashboardLayout title="Projets">
      <ProjectsPage />
    </DashboardLayout>
  );
}
