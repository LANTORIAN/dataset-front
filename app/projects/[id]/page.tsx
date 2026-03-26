import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetail({ params }: Props) {
  const { id } = await params;
  return (
    <DashboardLayout title="Détail du projet">
      <ProjectDetailPage projectId={id} />
    </DashboardLayout>
  );
}
