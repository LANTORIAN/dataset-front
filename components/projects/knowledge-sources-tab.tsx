"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, Play, CheckCircle2, XCircle, Clock,
  Globe, AlertCircle, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { knowledgeSourcesService } from "@/services/knowledge-sources.service";
import type { KnowledgeSource, CreateKnowledgeSourcePayload, HttpMethod } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  apiKey: string;
}

interface FormState {
  name: string;
  description: string;
  url: string;
  method: HttpMethod;
  api_key: string;
  payload_raw: string;
  response_path: string;
  text_field: string;
  timeout: string;
  scope_keywords_raw: string;
  is_enabled: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  url: "",
  method: "POST",
  api_key: "",
  payload_raw: '{"query": "{query}"}',
  response_path: "",
  text_field: "",
  timeout: "10",
  scope_keywords_raw: "",
  is_enabled: true,
};

function sourceToForm(s: KnowledgeSource): FormState {
  return {
    name:               s.name,
    description:        s.description ?? "",
    url:                s.url,
    method:             s.method,
    api_key:            "",                          // never prefilled (encrypted)
    payload_raw:        s.payload ? JSON.stringify(s.payload, null, 2) : '{"query": "{query}"}',
    response_path:      s.response_path ?? "",
    text_field:         s.text_field ?? "",
    timeout:            String(s.timeout ?? 10),
    scope_keywords_raw: (s.scope_keywords ?? []).join(", "),
    is_enabled:         s.is_enabled,
  };
}

function formToPayload(form: FormState): CreateKnowledgeSourcePayload {
  let payload: Record<string, unknown> | undefined;
  try { payload = JSON.parse(form.payload_raw); } catch { payload = undefined; }

  const keywords = form.scope_keywords_raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return {
    name:             form.name.trim(),
    description:      form.description.trim() || undefined,
    url:              form.url.trim(),
    method:           form.method,
    api_key:          form.api_key.trim() || undefined,
    payload:          payload,
    response_path:    form.response_path.trim() || undefined,
    text_field:       form.text_field.trim() || undefined,
    timeout:          parseInt(form.timeout, 10) || 10,
    scope_keywords:   keywords,
    is_enabled:       form.is_enabled,
  };
}

// ── Component principal ────────────────────────────────────────────────────

export function KnowledgeSourcesTab({ projectId, apiKey }: Props) {
  const [sources, setSources]       = useState<KnowledgeSource[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeSource | null>(null);
  const [testingId, setTestingId]   = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; preview: string | null; error: string | null }>>({});

  const load = () => {
    if (!apiKey) return;
    setLoading(true);
    knowledgeSourcesService.list(projectId, apiKey).then((r) => {
      if (r.ok) setSources(r.data.sources);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId, apiKey]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const handleToggle = async (source: KnowledgeSource) => {
    const r = await knowledgeSourcesService.toggle(projectId, source.id, apiKey, !source.is_enabled);
    if (r.ok) setSources((prev) => prev.map((s) => s.id === source.id ? r.data : s));
  };

  const handleTest = async (source: KnowledgeSource) => {
    setTestingId(source.id);
    const r = await knowledgeSourcesService.test(projectId, source.id, apiKey);
    setTestingId(null);
    if (r.ok) {
      setTestResults((prev) => ({
        ...prev,
        [source.id]: { success: r.data.success, preview: r.data.response_preview, error: r.data.error },
      }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const r = await knowledgeSourcesService.delete(projectId, deleteTarget.id, apiKey, deleteTarget.name);
    if (r.ok) setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const openAdd = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (s: KnowledgeSource) => { setEditTarget(s); setDialogOpen(true); };

  const handleSaved = (saved: KnowledgeSource, isNew: boolean) => {
    setSources((prev) => isNew ? [...prev, saved] : prev.map((s) => s.id === saved.id ? saved : s));
    setDialogOpen(false);
    setEditTarget(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Sources de connaissances externes</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            APIs interrogées en parallèle avec la recherche RAG (vector + TF-IDF).
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd} disabled={!apiKey}>
          <Plus className="size-4" />Ajouter une source
        </Button>
      </div>

      {!apiKey && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-surface-border bg-warning-surface p-3 text-xs text-warning-surface-foreground">
          <AlertCircle className="size-4 shrink-0" />
          Clé API du projet non disponible — revenez sur cet onglet après avoir chargé le projet.
        </div>
      )}

      {/* Liste */}
      {sources.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Globe className="size-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aucune source externe</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4 text-center max-w-xs">
            Connectez des APIs externes pour enrichir les réponses de l&apos;IA au-delà des fichiers indexés.
          </p>
          <Button size="sm" className="gap-2" onClick={openAdd} disabled={!apiKey}>
            <Plus className="size-4" />Ajouter une source
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              testResult={testResults[source.id]}
              isTesting={testingId === source.id}
              onToggle={() => handleToggle(source)}
              onTest={() => handleTest(source)}
              onEdit={() => openEdit(source)}
              onDelete={() => setDeleteTarget(source)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <SourceFormDialog
        open={dialogOpen}
        editTarget={editTarget}
        projectId={projectId}
        apiKey={apiKey}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette source ?</AlertDialogTitle>
            <AlertDialogDescription>
              La source <strong>{deleteTarget?.name}</strong> sera définitivement supprimée.
              Le pipeline RAG ne l&apos;interrogera plus.
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

// ── SourceCard ─────────────────────────────────────────────────────────────

function SourceCard({
  source, testResult, isTesting,
  onToggle, onTest, onEdit, onDelete,
}: {
  source: KnowledgeSource;
  testResult?: { success: boolean; preview: string | null; error: string | null };
  isTesting: boolean;
  onToggle: () => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className={source.is_enabled ? "" : "opacity-60"}>
      <CardHeader className="pb-2 flex flex-row items-start gap-3 space-y-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm">{source.name}</CardTitle>
            <Badge variant="outline" className="text-xs h-4">{source.method}</Badge>
            {source.scope_keywords.length === 0 && (
              <Badge variant="secondary" className="text-xs h-4">catch-all</Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-0.5 truncate">{source.url}</CardDescription>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={source.is_enabled}
            onCheckedChange={onToggle}
            aria-label={source.is_enabled ? "Désactiver" : "Activer"}
          />
          <Button variant="ghost" size="icon" className="size-7" onClick={onTest} disabled={isTesting}>
            {isTesting
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Play className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Scope keywords */}
        {source.scope_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {source.scope_keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs h-4 font-normal">{kw}</Badge>
            ))}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`rounded-md border p-2 text-xs ${testResult.success ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <div className="flex items-center gap-1.5 font-medium mb-1">
              {testResult.success
                ? <CheckCircle2 className="size-3.5 text-success" />
                : <XCircle className="size-3.5 text-destructive" />}
              {testResult.success ? "Test réussi" : "Test échoué"}
              {testResult.preview && (
                <button
                  className="ml-auto flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  Aperçu
                  {showPreview ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              )}
            </div>
            {testResult.error && <p className="text-destructive">{testResult.error}</p>}
            {showPreview && testResult.preview && (
              <pre className="mt-1 overflow-auto max-h-32 text-muted-foreground whitespace-pre-wrap break-all">
                {testResult.preview}
              </pre>
            )}
          </div>
        )}

        {/* Last test metadata */}
        {source.last_tested_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            Dernier test :{" "}
            {(() => {
              const d = new Date(source.last_tested_at);
              return isNaN(d.getTime()) ? "—" : format(d, "d MMM, HH:mm", { locale: fr });
            })()}
            {" "}—{" "}
            {source.last_test_success
              ? <span className="text-success">succès</span>
              : <span className="text-destructive">échec</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── SourceFormDialog ───────────────────────────────────────────────────────

function SourceFormDialog({
  open, editTarget, projectId, apiKey, onClose, onSaved,
}: {
  open: boolean;
  editTarget: KnowledgeSource | null;
  projectId: string;
  apiKey: string;
  onClose: () => void;
  onSaved: (saved: KnowledgeSource, isNew: boolean) => void;
}) {
  const [form, setForm]   = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdv] = useState(false);

  // Reset form when dialog opens/switches target
  useEffect(() => {
    if (open) {
      setForm(editTarget ? sourceToForm(editTarget) : EMPTY_FORM); // eslint-disable-line react-hooks/set-state-in-effect
      setShowAdv(false);
    }
  }, [open, editTarget]);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    setLoading(true);

    const payload = formToPayload(form);

    if (editTarget) {
      const r = await knowledgeSourcesService.update(projectId, editTarget.id, apiKey, payload);
      if (r.ok) onSaved(r.data, false);
    } else {
      const r = await knowledgeSourcesService.create(projectId, apiKey, payload);
      if (r.ok) onSaved(r.data, true);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Modifier la source" : "Ajouter une source externe"}</DialogTitle>
          <DialogDescription>
            L&apos;API sera interrogée en parallèle avec le RAG pour enrichir les réponses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="ks-name" className="text-xs">Nom <span className="text-destructive">*</span></Label>
            <Input id="ks-name" value={form.name} onChange={set("name")} placeholder="Catalogue Produits" required className="h-8 text-sm" />
          </div>

          {/* URL + Method */}
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ks-url" className="text-xs">URL <span className="text-destructive">*</span></Label>
              <Input id="ks-url" value={form.url} onChange={set("url")} placeholder="https://api.example.com/search" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Méthode</Label>
              <Select value={form.method} onValueChange={(v) => setForm((p) => ({ ...p, method: v as HttpMethod }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scope keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="ks-scope" className="text-xs">
              Scope keywords
              <span className="ml-1 text-muted-foreground font-normal">(séparés par des virgules)</span>
            </Label>
            <Input
              id="ks-scope" value={form.scope_keywords_raw} onChange={set("scope_keywords_raw")}
              placeholder="prix, tarif, forfait  — vide = catch-all" className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Vide = toujours appelée. Avec mots-clés = appelée uniquement si la question contient un match.
            </p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <Switch
              id="ks-enabled"
              checked={form.is_enabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_enabled: v }))}
            />
            <Label htmlFor="ks-enabled" className="text-xs cursor-pointer">Source activée</Label>
          </div>

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowAdv((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-t pt-2"
          >
            <span>Paramètres avancés</span>
            {showAdvanced ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="ks-apikey" className="text-xs">
                  Clé API / Bearer token
                  {editTarget && <span className="ml-1 text-muted-foreground font-normal">(laisser vide pour ne pas changer)</span>}
                </Label>
                <Input id="ks-apikey" type="password" value={form.api_key} onChange={set("api_key")}
                  placeholder="sk-..." className="h-8 text-sm font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ks-payload" className="text-xs">
                  Body JSON (POST)
                  <span className="ml-1 text-muted-foreground font-normal">— <code className="text-xs">{"{query}"}</code> sera remplacé</span>
                </Label>
                <textarea
                  id="ks-payload" value={form.payload_raw}
                  onChange={(e) => setForm((p) => ({ ...p, payload_raw: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ks-rpath" className="text-xs">
                    response_path
                    <span className="ml-1 text-muted-foreground font-normal">(dot-path)</span>
                  </Label>
                  <Input id="ks-rpath" value={form.response_path} onChange={set("response_path")}
                    placeholder="data.items" className="h-8 text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ks-tfield" className="text-xs">text_field</Label>
                  <Input id="ks-tfield" value={form.text_field} onChange={set("text_field")}
                    placeholder="content" className="h-8 text-xs font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ks-timeout" className="text-xs">Timeout (s)</Label>
                  <Input id="ks-timeout" type="number" min={1} max={60} value={form.timeout}
                    onChange={set("timeout")} className="h-8 text-sm w-20" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ks-desc" className="text-xs">Description</Label>
                  <Input id="ks-desc" value={form.description} onChange={set("description")}
                    placeholder="Optionnelle" className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !form.name.trim() || !form.url.trim()}>
              {loading ? "Enregistrement…" : editTarget ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
