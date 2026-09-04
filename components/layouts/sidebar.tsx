"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Settings,
  Shield,
  X,
  BarChart2,
  HelpCircle,
  LifeBuoy,
  BookOpen,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { MindLogo } from "@/components/branding/mind-logo";

const BASE_NAV = [
  {
    section: "PRINCIPAL",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    section: "DATASETS",
    items: [
      { title: "Projets",          href: "/projects",   icon: FolderOpen  },
      { title: "Accès & clés", href: "/projects/access", icon: KeyRound },
      { title: "Base de connaissance FAQ", href: "/faq", icon: HelpCircle },
      { title: "Analytics",        href: "/analytics",  icon: BarChart2   },
    ],
  },
  {
    section: "SYSTÈME",
    items: [
      { title: "Paramètres", href: "/settings", icon: Settings },
      { title: "Documentation", href: "/documentation", icon: BookOpen },
    ],
  },
];

const ADMIN_ITEMS = [
  { title: "Administration", href: "/admin", icon: Shield },
  { title: "Contenu documentation", href: "/admin/documentation", icon: BookOpen },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  // Extrait l'ID de projet depuis /projects/[id]
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentProjectId = projectMatch?.[1] ?? null;

  // "Conversations" visible uniquement si l'utilisateur est dans un projet ou sur /chat
  const chatHref = currentProjectId ? `/chat?project=${currentProjectId}` : "/chat";
  const showChat = currentProjectId !== null || pathname.startsWith("/chat");

  const chatSection = {
    section: "CHAT IA",
    items: [{ title: "Conversations", href: chatHref, icon: MessageSquare }],
  };

  // Insère la section CHAT IA entre DATASETS et SYSTÈME quand applicable
  const navSections = showChat
    ? [BASE_NAV[0], BASE_NAV[1], chatSection, BASE_NAV[2]]
    : BASE_NAV;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin";
    if (href === "/documentation") return pathname === "/documentation";
    if (href.startsWith("/chat")) return pathname.startsWith("/chat");
    return pathname.startsWith(href);
  };

  return (
    <>
      {isMobile && !isOpen && (
        <Link
          href="/support"
          className="fixed bottom-4 left-4 z-40 flex size-10 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg"
          aria-label="Support"
        >
          <LifeBuoy className="size-4" />
        </Link>
      )}

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 animate-fade-in cursor-default"
          onClick={onClose}
          aria-label="Fermer le menu"
          tabIndex={-1}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 shadow-2xl"
            : "sticky top-0 h-screen",
          isOpen ? "w-64" : "w-0"
        )}
      >
          <div className="flex h-full min-w-64 flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <MindLogo className="size-7 text-sidebar-primary transition-transform duration-200 group-hover:rotate-6" />
              <span className="text-sm font-semibold tracking-tight">Dataset<span className="text-sidebar-primary">AI</span></span>
            </Link>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-7 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* Nav */}
          <ScrollArea className="flex-1 px-3 py-4">
            {[
              ...navSections,
              ...(isAdmin ? [{ section: "ADMIN", items: ADMIN_ITEMS }] : []),
            ].map((section) => (
              <div key={section.section} className="mb-6 last:mb-0">
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-sidebar-foreground/45">
                  {section.section}
                </p>
                <nav>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => isMobile && onClose()}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive(item.href)
                              ? "bg-sidebar-primary/12 text-sidebar-primary ring-1 ring-inset ring-sidebar-primary/25"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            <Link
              href="/support"
              onClick={() => isMobile && onClose()}
              className={cn(
                 "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                 isActive("/support")
                   ? "bg-sidebar-primary/12 text-sidebar-primary ring-1 ring-inset ring-sidebar-primary/25"
                   : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <LifeBuoy className="size-4 shrink-0" />
              <span>Support</span>
            </Link>
             <p className="px-2 text-[10px] uppercase tracking-[.14em] text-sidebar-foreground/35">Workspace v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
