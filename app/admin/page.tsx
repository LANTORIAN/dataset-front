import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AdminPage } from "@/components/admin/admin-page";

export default function Admin() {
  return (
    <DashboardLayout title="Administration">
      <AdminPage />
    </DashboardLayout>
  );
}
