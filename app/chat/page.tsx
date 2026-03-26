import { Suspense } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ChatPage } from "@/components/chat/chat-page";

export default function Chat() {
  return (
    <DashboardLayout title="Chat IA">
      <Suspense>
        <ChatPage />
      </Suspense>
    </DashboardLayout>
  );
}
