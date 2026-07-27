"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, FolderOpen, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { conversationsService } from "@/services/conversations.service";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Project, Conversation } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PAGE_SIZE = 20;

interface Props {
  projects: Project[];
  selectedProjectId: string;
  apiKey: string;
  activeConversationId?: string;
  refreshTrigger?: number;
  onSelectProject: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationsSidebar({
  projects, selectedProjectId, apiKey, activeConversationId, refreshTrigger,
  onSelectProject, onSelectConversation, onNewConversation,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch]               = useState("");
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [loading, setLoading]             = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<Conversation | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  // Stable resolved ID — becomes non-null only once the project is found in the loaded list
  const resolvedProjectId = selectedProject?.id ?? null;

  const load = (p = page) => {
    if (!selectedProject || !apiKey) { setConversations([]); return; }
    setLoading(true);
    conversationsService.list(apiKey, p, PAGE_SIZE).then((r) => {
      if (r.ok) {
        setConversations(r.data.conversations);
        setTotalPages(r.data.pagination?.pages ?? 1);
      }
    }).finally(() => setLoading(false));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await conversationsService.delete(deleteTarget.id, apiKey);
    if (result.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (activeConversationId === deleteTarget.id) onSelectConversation("");
    }
    setDeleteTarget(null);
  };

  // Fire when the project is actually resolved (handles async project list load)
  // or when a new conversation is created
  useEffect(() => {
    if (!resolvedProjectId) { setConversations([]); return; }
    if (!apiKey) return;
    setPage(1);
    setSearch("");
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedProjectId, refreshTrigger, apiKey]);

  // Fire when page changes (pagination click)
  useEffect(() => {
    if (!resolvedProjectId || !apiKey) return;
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, resolvedProjectId, apiKey]);

  // Client-side search filter (backend doesn't expose conversation search)
  const filtered = debouncedSearch
    ? conversations.filter((c) =>
        c.id.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : conversations;

  return (
    <>
    <div className="flex h-full flex-col">
      {/* Project selector */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Projet</p>
        <Select value={selectedProjectId} onValueChange={onSelectProject}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Choisir un projet…">
              {projects.find((p) => p.id === selectedProjectId)?.name ?? "Choisir un projet…"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <SelectItem value="_none" disabled>Aucun projet disponible</SelectItem>
            ) : (
              projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="size-3" />{p.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          size="sm" variant="outline"
          className="w-full gap-2 text-xs h-8"
          onClick={onNewConversation}
          disabled={!selectedProjectId || !apiKey}
        >
          <Plus className="size-3" />Nouvelle conversation
        </Button>
      </div>

      <Separator />

      {/* Search */}
      {selectedProjectId && (
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>
      )}

      <div className="px-3 py-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Historique
        </p>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-3">
        {loading ? (
          <div className="space-y-1 pb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="size-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? "Aucun résultat" : "Aucune conversation"}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 pb-4">
            {filtered.map((conv) => (
              <li key={conv.id} className="group relative">
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-2 pr-7 text-xs transition-colors hover:bg-accent",
                    activeConversationId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <p className="font-medium line-clamp-1 text-foreground">
                    Conversation {conv.id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 opacity-50">
                    {(() => {
                      const d = new Date(conv.updated_at ?? conv.created_at);
                      return isNaN(d.getTime()) ? "" : format(d, "d MMM, HH:mm", { locale: fr });
                    })()}
                  </p>
                  <p className="mt-0.5 opacity-60">{conv.message_count} message(s)</p>
                </button>
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv); }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && !debouncedSearch && (
        <>
          <Separator />
          <div className="flex items-center justify-between px-3 py-2">
            <Button
              variant="ghost" size="icon" className="size-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="ghost" size="icon" className="size-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>

    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
          <AlertDialogDescription>
            La conversation <span className="font-mono">{deleteTarget?.id.slice(0, 8)}</span> et
            tous ses messages seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDeleteConfirm}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
