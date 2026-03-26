import type { Metadata } from "next";

export const metadata: Metadata = { title: "Authentification — Dataset IA" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {children}
    </div>
  );
}
