"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText, MessageSquare, Trash2, ArrowLeft,
  CheckCircle, Clock, AlertCircle, Loader2, Search,
  Edit3, RefreshCw,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadFileDialog } from "./upload-file-dialog";
import { ProjectConfigForm } from "./project-config-form";
import { KnowledgeSourcesTab } from "./knowledge-sources-tab";
import { ProjectDatabaseTab } from "./project-database-tab";
import { ProjectSqlTab } from "./project-sql-tab";
import { ProjectMarketplaceTab } from "./project-marketplace-tab";
import { ProjectWorkflowTab } from "./project-workflow-tab";
import { ProjectCachePanel } from "./project-cache-panel";
import { RagFileEditorDialog } from "./rag-file-editor-dialog";
import { projectsService } from "@/services/projects.service";
import { ragFilesService } from "@/services/rag-files.service";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Project, RagFile, RagFileStatus } from "@/types";

const STATUS_ICON: Record<RagFileStatus, React.ReactNode> = {
  ready:      <CheckCircle className="size-3.5 text-success" />,
  processing: <Loader2 className="size-3.5 text-info animate-spin" />,
  error:      <AlertCircle className="size-3.5 text-destructive" />,
};
const STATUS_LABEL: Record<string, string> = {
  ready: "Prêt", processing: "Indexation…", error: "Erreur", pending: "En attente",
};

const fmt = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

type StatusFilter = "all" | "ready" | "processing" | "error" | "pending";

const PAGE_SIZE = 10;

interface Props { projectId: string }

export function ProjectDetailPage({ projectId }: Props) {
  const [project, setProject]   = useState<Project | null>(null);
  const [apiKey, setApiKey]     = useState("");
  const [files, setFiles]       = useState<RagFile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState<StatusFilter>("all");
  const [page, setPage]         = useState(1);
  const [editorFile, setEditorFile] = useState<RagFile | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = async () => {
    setLoading(true);
    const projResult = await projectsService.get(projectId);
    if (projResult.ok) {
      setProject(projResult.data);
      const keyResult = await projectsService.revealKey(projectId);
      if (keyResult.ok) {
        setApiKey(keyResult.data.api_key);
        const fr = await ragFilesService.list(projectId, keyResult.data.api_key);
        if (fr.ok) setFiles(fr.data);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  // Reset page when filter/search changes
  useEffect(() => { setPage(1); }, [debouncedSearch, status]); // eslint-disable-line react-hooks/set-state-in-effect

  const filtered = useMemo(() => {
    let result = files;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((f) => f.filename.toLowerCase().includes(q));
    }
    if (status !== "all") {
      result = result.filter((f) => f.status === status);
    }
    return result;
  }, [files, debouncedSearch, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDeleteFile = async (filename: string) => {
    if (!project) return;
    if (!confirm(`Supprimer "${filename}" ?`)) return;
    const result = await ragFilesService.delete(projectId, filename, apiKey);
    if (result.ok) setFiles((prev) => prev.filter((f) => f.filename !== filename));
  };

  const handleRebuild = async () => {
    if (!apiKey) return;
    setRebuilding(true);
    const result = await ragFilesService.rebuild(projectId, apiKey);
    setRebuilding(false);
    if (result.ok) await load();
  };

  if (loading) {
    return (
      <div className="space-y-7 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton size-8 rounded-md" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48 rounded" />
            <div className="skeleton h-4 w-64 rounded" />
          </div>
        </div>
        <div className="skeleton h-10 w-full max-w-5xl rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-6"><div className="skeleton h-12 rounded" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-10 rounded" />
          ))}
        </CardContent></Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Projet introuvable.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/projects"><ArrowLeft className="size-4 mr-2" />Retour</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link href="/projects"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href={`/chat?project=${project.id}`}>
            <MessageSquare className="size-4" />Chat IA
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="files">
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-5xl md:mx-auto md:grid-cols-7">
            <TabsTrigger value="files">Fichiers</TabsTrigger>
            <TabsTrigger value="sources" className="whitespace-nowrap">Sources externes</TabsTrigger>
            <TabsTrigger value="database" className="whitespace-nowrap">Base de données</TabsTrigger>
            <TabsTrigger value="sql" className="whitespace-nowrap">SQL Agent</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="config" className="mt-4">
          <ProjectConfigForm
            project={project}
            onSaved={(updated) => setProject(updated)}
          />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <KnowledgeSourcesTab projectId={projectId} apiKey={apiKey} />
        </TabsContent>

        <TabsContent value="database" className="mt-4">
          <ProjectDatabaseTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="sql" className="mt-4">
          <ProjectSqlTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="marketplace" className="mt-4">
          <ProjectMarketplaceTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          <ProjectWorkflowTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Total fichiers</CardDescription>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{files.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Indexés</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {files.filter((f) => f.status === "ready").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">En cours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-info">
              {files.filter((f) => f.status === "processing").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Files table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Fichiers du dataset</CardTitle>
            <CardDescription>Fichiers indexés dans la base vectorielle du projet</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRebuild} disabled={!apiKey || rebuilding}>
              {rebuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Reconstruire
            </Button>
            <UploadFileDialog projectId={projectId} apiKey={apiKey} onUploaded={load} />
          </div>
        </CardHeader>

        {/* Toolbar */}
        <div className="flex gap-2 px-6 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un fichier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ready">Prêt</SelectItem>
              <SelectItem value="processing">Indexation</SelectItem>
              <SelectItem value="error">Erreur</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="rounded-full bg-muted p-3 mb-4">
                <FileText className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {search || status !== "all" ? "Aucun résultat" : "Aucun fichier importé"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {search || status !== "all"
                  ? "Modifiez vos filtres pour afficher des fichiers."
                  : "Importez vos données pour alimenter l'IA de ce projet."}
              </p>
              {!search && status === "all" && (
                <div className="mt-4">
                  <UploadFileDialog projectId={projectId} apiKey={apiKey} onUploaded={load} />
                </div>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium text-sm">{file.filename}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {file.file_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(file.size_bytes)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[file.status] ?? <Clock className="size-3.5 text-warning" />}
                          <span className="text-xs">{STATUS_LABEL[file.status] ?? file.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.chunks_count ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="size-7"
                            onClick={() => setEditorFile(file)}
                            title="Lire ou modifier le fichier"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteFile(file.filename)}
                            title="Supprimer le fichier"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
                    </span>
                  </div>
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ProjectCachePanel projectId={projectId} apiKey={apiKey} />

      <RagFileEditorDialog
        projectId={projectId}
        apiKey={apiKey}
        file={editorFile}
        open={!!editorFile}
        onOpenChange={(open) => { if (!open) setEditorFile(null); }}
        onSaved={load}
      />

        </TabsContent>
      </Tabs>
    </div>
  );
}
