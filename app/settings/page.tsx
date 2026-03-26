import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { SettingsPage } from "@/components/settings/settings-page";

export default function Settings() {
  return (
    <DashboardLayout title="Paramètres">
      <SettingsPage />
    </DashboardLayout>
  );
}
