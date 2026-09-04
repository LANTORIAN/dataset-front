import type { Metadata } from "next";
import { MindLogo } from "@/components/branding/mind-logo";

export const metadata: Metadata = { title: "Authentification — Dataset IA" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell min-h-screen p-4">
      <div className="auth-pitch hidden md:flex">
        <div>
          <div className="mb-10 flex items-center gap-3 text-sm font-semibold">
            <MindLogo className="size-8 text-primary" />
            Dataset<span className="text-primary">AI</span>
          </div>
          <p className="auth-pitch__eyebrow">Workspace agentique</p>
          <h1>Les bonnes sources.<br /><em>La bonne réponse.</em></h1>
          <p className="max-w-sm text-sm leading-6 text-sidebar-foreground/65">
            Centralisez vos documents, vos données et vos outils pour laisser l&apos;agent orchestrer chaque demande avec des preuves.
          </p>
        </div>
        <div className="auth-pitch__footer">RAG · SQL · APIs · ACTIONS</div>
      </div>
      <div className="auth-content">{children}</div>
    </div>
  );
}
