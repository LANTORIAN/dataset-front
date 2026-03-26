import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AnalyticsPage } from "@/components/analytics/analytics-page";

export default function Page() {
  return (
    <DashboardLayout title="Analytics & Support">
      <AnalyticsPage />
    </DashboardLayout>
  );
}
