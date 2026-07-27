"use client";

import { useEffect, useState } from "react";
import { Database, Edit3, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ragFilesService } from "@/services/rag-files.service";
import type { ProjectCacheEntry, ProjectCacheScope } from "@/types";

interface Props {
  projectId: string;
  apiKey: string;
}

const CACHE_SCOPES: { value: ProjectCacheScope; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "responses", label: "Réponses" },
  { value: "rag", label: "RAG" },
  { value: "db_followup", label: "DB follow-up" },
];

function fmt(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function serializeValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function ProjectCachePanel({ projectId, apiKey }: Props) {
  const [scope, setScope] = useState<ProjectCacheScope>("all");
  const [enabled, setEnabled] = useState(true);
  const [entries, setEntries] = useState<ProjectCacheEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState<ProjectCacheEntry | null>(null);
  const [draft, setDraft] = useState("");
  const [ttl, setTtl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!apiKey) return;
    setLoading(true);
    const result = await ragFilesService.listCache(projectId, apiKey, scope);
    setLoading(false);
    if (result.ok) {
      setEnabled(result.data.enabled);
      setEntries(result.data.entries);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, apiKey, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (entry: ProjectCacheEntry) => {
    setEditEntry(entry);
    setDraft(serializeValue(entry.value));
    setTtl(entry.ttl_seconds ? String(entry.ttl_seconds) : "");
  };

  const handleSave = async () => {
    if (!editEntry) return;
    let value: unknown = draft;
    try {
      value = JSON.parse(draft);
    } catch {
      if (editEntry.value_type !== "str") {
        toast.error("JSON invalide pour cette entrée cache");
        return;
      }
    }

    setSaving(true);
    const result = await ragFilesService.updateCache(
      projectId,
      apiKey,
      editEntry.key,
      value,
      ttl ? Number(ttl) : null
    );
    setSaving(false);
    if (result.ok) {
      setEditEntry(null);
      await load();
    }
  };

  const handleDelete = async (entry: ProjectCacheEntry) => {
    if (!confirm(`Supprimer cette entrée cache ?\n${entry.key}`)) return;
    const result = await ragFilesService.deleteCache(projectId, apiKey, entry.key);
    if (result.ok) await load();
  };

  const handlePurge = async () => {
    if (scope === "all") {
      toast.error("Choisissez un scope précis avant de purger");
      return;
    }
    if (!confirm(`Purger tous les caches du scope "${scope}" ?`)) return;
    const result = await ragFilesService.purgeCacheScope(projectId, apiKey, scope);
    if (result.ok) await load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4" /> Caches projet
          </CardTitle>
          <CardDescription>
            Réponses, RAG et snapshots temporaires liés à ce projet.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value as ProjectCacheScope)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CACHE_SCOPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading || !apiKey}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Rafraîchir
          </Button>
          <Button variant="outline" size="sm" onClick={handlePurge} disabled={scope === "all" || loading || !apiKey}>
            Purger scope
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!enabled ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            Cache Redis indisponible ou désactivé.
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            Aucun cache trouvé pour ce scope.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Clé</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell><Badge variant="outline">{entry.scope}</Badge></TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs" title={entry.key}>{entry.key}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.ttl_seconds ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(entry.size_bytes)}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={entry.preview}>{entry.preview}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(entry)}>
                        <Edit3 className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(entry)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Modifier une entrée cache</DialogTitle>
            <DialogDescription className="break-all font-mono text-xs">
              {editEntry?.key}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto px-6 py-4">
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="cache-ttl">TTL secondes</Label>
              <Input
                id="cache-ttl"
                type="number"
                min={1}
                max={86400}
                placeholder="TTL existant"
                value={ttl}
                onChange={(event) => setTtl(event.target.value)}
              />
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[52vh] resize-none font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditEntry(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
