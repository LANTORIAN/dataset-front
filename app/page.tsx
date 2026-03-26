import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function Home() {
  return (
    <DashboardLayout title="Dashboard">
      <DashboardPage />
    </DashboardLayout>
  );
}
