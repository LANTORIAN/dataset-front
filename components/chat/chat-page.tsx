"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChatInterface } from "./chat-interface";
import { ConversationsSidebar } from "./conversations-sidebar";
import { projectsService } from "@/services/projects.service";
import type { Project } from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

export function ChatPage() {
  const searchParams     = useSearchParams();
  const router           = useRouter();
  const pathname         = usePathname();
  const defaultProjectId = searchParams.get("project") ?? "";
  const defaultConvId    = searchParams.get("conversation") ?? undefined;

  const [projects, setProjects]               = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const [resolvedProjectKey, setResolvedProjectKey] = useState({ projectId: "", apiKey: "" });
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(defaultConvId);
  const [convRefreshKey, setConvRefreshKey]   = useState(0);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const resolvedApiKey = resolvedProjectKey.projectId === selectedProjectId
    ? resolvedProjectKey.apiKey
    : "";

  // Keep URL in sync with project + conversation selection
  const syncUrl = useCallback((projectId: string, convId?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("project", projectId);
    if (convId) params.set("conversation", convId);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, pathname]);

  // Load all projects (load enough for the selector — 100 max)
  useEffect(() => {
    projectsService.list({ limit: 100 }).then((r) => {
      if (r.ok) {
        setProjects(r.data.projects);
      }
    });
  }, [defaultProjectId]);

  // When project selection changes, update selectedProject and reveal its API key
  useEffect(() => {
    let cancelled = false;

    if (!selectedProjectId || !selectedProject) {
      return;
    }

    projectsService.revealKey(selectedProjectId).then((r) => {
      if (!cancelled && r.ok) {
        setResolvedProjectKey({ projectId: selectedProjectId, apiKey: r.data.api_key });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, selectedProject]);

  const handleSelectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setActiveConversationId(undefined);
    syncUrl(id);
  }, [syncUrl]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    syncUrl(selectedProjectId, id);
  }, [syncUrl, selectedProjectId]);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
    syncUrl(selectedProjectId);
  }, [syncUrl, selectedProjectId]);

  const sidebarProps = {
    projects,
    selectedProjectId,
    apiKey: resolvedApiKey,
    activeConversationId,
    refreshTrigger: convRefreshKey,
    onSelectProject: handleSelectProject,
    onSelectConversation: handleSelectConversation,
    onNewConversation: handleNewConversation,
  };

  return (
    <div className="chat-frame mx-auto flex h-[calc(100vh-8.5rem)] w-full max-w-7xl overflow-hidden rounded-2xl border bg-card/80">
      {/* Desktop sidebar */}
      <aside className="chat-history-panel hidden w-72 shrink-0 flex-col border-r md:flex">
        <ConversationsSidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <div className="md:hidden absolute top-24 left-5 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="size-8">
              <History className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <ConversationsSidebar {...sidebarProps} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Chat area */}
      <div className="chat-main flex flex-1 flex-col overflow-hidden">
        <ChatInterface
          project={selectedProject}
          apiKey={resolvedApiKey}
          conversationId={activeConversationId}
          onConversationCreated={(id) => {
            setActiveConversationId(id);
            setConvRefreshKey((k) => k + 1);
            syncUrl(selectedProjectId, id);
          }}
        />
      </div>
    </div>
  );
}
