"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/lib/context/auth-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { isLoading, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen]     = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Redirect to /login once loading finishes and user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Account pending admin approval
  if (!user?.is_approved) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="rounded-xl bg-warning-surface p-4">
          <Clock className="size-8 text-warning-foreground" />
        </div>
        <h1 className="text-xl font-bold">Compte en attente d&apos;approbation</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Votre compte <strong>{user?.username}</strong> attend la validation d&apos;un administrateur.
          Vous serez notifié une fois approuvé.
        </p>
        <Button variant="outline" onClick={() => logout()}>Se déconnecter</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} isMobile={isMobile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={() => setIsOpen((v) => !v)} title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
