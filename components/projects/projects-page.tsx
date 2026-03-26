"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen, FileText, MessageSquare, MoreHorizontal, Trash2,
  Search, SortAsc, SortDesc, Pencil,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { CreateProjectDialog } from "./create-project-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
import { projectsService } from "@/services/projects.service";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Project } from "@/types";

type SortBy = "name" | "created_at" | "updated_at";
type Order  = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 12;

export function ProjectsPage() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [sortBy, setSortBy]           = useState<SortBy>("created_at");
  const [order, setOrder]             = useState<Order>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 when filters/search change (not when page or refreshKey change)
  useEffect(() => { setPage(1); }, [debouncedSearch, sortBy, order]);

  // Single load effect
  useEffect(() => {
    setLoading(true);
    projectsService.list({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      order,
    }).then((result) => {
      if (result.ok) {
        setProjects(result.data.projects);
        setTotalPages(result.data.pagination.pages);
        setTotal(result.data.pagination.total);
      }
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, sortBy, order, refreshKey]);

  const visibleProjects = statusFilter === "all"
    ? projects
    : projects.filter((p) => statusFilter === "active" ? p.is_active : !p.is_active);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await projectsService.delete(deleteTarget.id, deleteTarget.name);
    if (result.ok) refresh();
    setDeleteTarget(null);
  };

  const toggleOrder = () => setOrder((o) => o === "asc" ? "desc" : "asc");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projets</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {total > 0 ? `${total} projet${total > 1 ? "s" : ""}` : "Gérez vos datasets et leurs fichiers."}
          </p>
        </div>
        <CreateProjectDialog onCreated={refresh} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un projet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date de création</SelectItem>
            <SelectItem value="updated_at">Dernière mise à jour</SelectItem>
            <SelectItem value="name">Nom</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={toggleOrder}>
          {order === "asc"
            ? <SortAsc className="size-4" />
            : <SortDesc className="size-4" />}
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4 mt-2" />
              </CardHeader>
              <CardContent><div className="h-8 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : visibleProjects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">
            {search || statusFilter !== "all" ? "Aucun résultat" : "Aucun projet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search || statusFilter !== "all"
              ? "Modifiez vos filtres pour afficher des projets."
              : "Créez votre premier projet pour commencer."}
          </p>
          {!search && statusFilter === "all" && (
            <CreateProjectDialog onCreated={refresh} />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="size-4 text-primary shrink-0" />
                  <CardTitle className="text-sm font-semibold line-clamp-1">{project.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <MoreHorizontal className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditProject(project)}>
                      <Pencil className="size-3.5 mr-2" />Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(project)}
                    >
                      <Trash2 className="size-3.5 mr-2" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-3">
                {project.description && (
                  <CardDescription className="text-xs line-clamp-2">{project.description}</CardDescription>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <code className="truncate flex-1 font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    {project.api_key_masked}
                  </code>
                  <Badge
                    variant={project.is_active ? "default" : "secondary"}
                    className="text-xs h-4 shrink-0"
                  >
                    {project.is_active ? "actif" : "inactif"}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="flex-1 gap-1 text-xs">
                    <Link href={`/projects/${project.id}`}><FileText className="size-3" />Fichiers</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 gap-1 text-xs">
                    <Link href={`/chat?project=${project.id}`}><MessageSquare className="size-3" />Chat IA</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              if (totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              if (p === page - 2 || p === page + 2) {
                return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Edit dialog */}
      {editProject && (
        <EditProjectDialog
          project={editProject}
          open={!!editProject}
          onClose={() => setEditProject(null)}
          onSaved={(updated) => {
            setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setEditProject(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le projet <strong>{deleteTarget?.name}</strong> et tous ses fichiers indexés seront
              définitivement supprimés. Cette action est irréversible.
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
    </div>
  );
}
