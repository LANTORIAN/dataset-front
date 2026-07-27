import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { MarketplaceAdminPage } from "@/components/admin/marketplace-admin-page";

export default function AdminMarketplace() {
  return (
    <DashboardLayout title="Marketplace — Administration">
      <MarketplaceAdminPage />
    </DashboardLayout>
  );
}
