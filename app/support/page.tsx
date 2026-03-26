import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { SupportPage } from "@/components/support/support-page";

export default function Page() {
  return (
    <DashboardLayout title="Support">
      <SupportPage />
    </DashboardLayout>
  );
}
