import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { FaqPage } from "@/components/faq/faq-page";

export default function Page() {
  return (
    <DashboardLayout title="Base de connaissance FAQ">
      <FaqPage />
    </DashboardLayout>
  );
}
