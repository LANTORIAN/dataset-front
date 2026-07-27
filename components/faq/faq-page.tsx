"use client";

import { useEffect, useState } from "react";
import {
  HelpCircle, Plus, Trash2, FileText, Loader2,
  RefreshCw, BookOpen, CheckCircle, AlertCircle,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { projectsService } from "@/services/projects.service";
import { ragFilesService } from "@/services/rag-files.service";
import type { Project, RagFile } from "@/types";

const FAQ_PREFIX = "faq_";
const FAQ_EXT   = ".txt";

function isFaqFile(filename: string) {
  return filename.startsWith(FAQ_PREFIX) && filename.endsWith(FAQ_EXT);
}

function buildFaqFilename(question: string) {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u017E ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  return `${FAQ_PREFIX}${slug}_${Date.now()}${FAQ_EXT}`;
}

const fmt = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface FaqEntry {
  file: RagFile;
  question?: string;
  answer?: string;
}

export function FaqPage() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [projectId, setProjectId]       = useState("");
  const [apiKey, setApiKey]             = useState("");
  const [entries, setEntries]           = useState<FaqEntry[]>([]);
  const [otherFiles, setOtherFiles]     = useState<RagFile[]>([]);
  const [loading, setLoading]           = useState(false);
  const [addOpen, setAddOpen]           = useState(false);
  const [question, setQuestion]         = useState("");
  const [answer, setAnswer]             = useState("");
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqEntry | null>(null);

  // Load projects
  useEffect(() => {
    projectsService.list({ limit: 100 }).then((r) => {
      if (r.ok) {
        setProjects(r.data.projects);
        if (r.data.projects.length > 0) setProjectId(r.data.projects[0].id);
      }
    });
  }, []);

  // Reveal key when project changes
  useEffect(() => {
    if (!projectId) { setApiKey(""); return; } // eslint-disable-line react-hooks/set-state-in-effect
    projectsService.revealKey(projectId).then((r) => {
      if (r.ok) setApiKey(r.data.api_key);
    });
  }, [projectId]);

  const load = async () => {
    if (!projectId || !apiKey) return;
    setLoading(true);
    const r = await ragFilesService.list(projectId, apiKey);
    if (r.ok) {
      const faq: FaqEntry[] = [];
      const other: RagFile[] = [];
      for (const f of r.data) {
        if (isFaqFile(f.filename)) {
          faq.push({ file: f });
        } else {
          other.push(f);
        }
      }
      setEntries(faq);
      setOtherFiles(other);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId, apiKey]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!question.trim() || !answer.trim() || !projectId || !apiKey) return;
    setSaving(true);
    const content  = `Q: ${question.trim()}\nR: ${answer.trim()}\n`;
    const filename = buildFaqFilename(question);
    const blob = new Blob([content], { type: "text/plain" });
    const file = new File([blob], filename, { type: "text/plain" });

    const r = await ragFilesService.upload(projectId, file, { apiKey });
    if (r.ok) {
      setAddOpen(false);
      setQuestion("");
      setAnswer("");
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !projectId || !apiKey) return;
    const r = await ragFilesService.delete(projectId, deleteTarget.file.filename, apiKey);
    if (r.ok) {
      setEntries((prev) => prev.filter((e) => e.file.filename !== deleteTarget.file.filename));
    }
    setDeleteTarget(null);
  };

  const StatusIcon = ({ status }: { status: RagFile["status"] }) => {
    if (status === "ready")      return <CheckCircle className="size-3.5 text-success" />;
    if (status === "processing") return <Loader2 className="size-3.5 text-info animate-spin" />;
    return <AlertCircle className="size-3.5 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Base de connaissance FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les questions/réponses qui alimentent directement votre assistant IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="Choisir un projet…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-8" onClick={load} disabled={loading || !apiKey}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => setAddOpen(true)}
            disabled={!apiKey}
          >
            <Plus className="size-3.5" />Nouvelle entrée FAQ
          </Button>
        </div>
      </div>

      {!projectId ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          Sélectionnez un projet pour gérer sa base de connaissance FAQ.
        </div>
      ) : loading && entries.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* How it works info */}
          <Card className="border-info/30 bg-info/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <BookOpen className="size-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chaque entrée FAQ est stockée dans la base vectorielle au format{" "}
                  <code className="bg-muted px-1 rounded text-xs">Q: question / R: réponse</code>.
                  Quand un utilisateur pose une question similaire, l&apos;IA répond directement
                  sans passer par le modèle de langage — plus rapide et plus précis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ entries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="size-4" />Entrées FAQ
                </CardTitle>
                <CardDescription>
                  {entries.length} entrée{entries.length > 1 ? "s" : ""} — correspondent aux fichiers <code className="text-xs">faq_*.txt</code>
                </CardDescription>
              </div>
              <Badge variant="secondary">{entries.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <HelpCircle className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Aucune entrée FAQ</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajoutez des Q&A pour que l&apos;IA réponde instantanément aux questions fréquentes.
                  </p>
                  <Button
                    size="sm" variant="outline" className="mt-4 gap-1.5 text-xs"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="size-3" />Ajouter une entrée
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.file.filename}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <HelpCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-foreground line-clamp-1">
                                {entry.file.filename.replace(FAQ_PREFIX, "").replace(FAQ_EXT, "").replace(/_\d+$/, "").replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">{entry.file.filename}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmt(entry.file.size_bytes)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={entry.file.status} />
                            <span className="text-xs capitalize">{entry.file.status === "ready" ? "Indexée" : entry.file.status === "processing" ? "Indexation…" : "Erreur"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(entry)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Other knowledge base files */}
          {otherFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4" />Documents de la base de connaissance
                </CardTitle>
                <CardDescription>
                  Autres fichiers indexés — gérés depuis la page du projet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherFiles.map((f) => (
                      <TableRow key={f.filename}>
                        <TableCell className="text-sm font-medium">{f.filename}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {f.file_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmt(f.size_bytes)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={f.status} />
                            <span className="text-xs">{f.status === "ready" ? "Indexé" : f.status === "processing" ? "Indexation…" : "Erreur"}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add FAQ dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setQuestion(""); setAnswer(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="size-4" />Nouvelle entrée FAQ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input
                placeholder="Ex: Quels sont vos horaires d'ouverture ?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Réponse</Label>
              <Textarea
                placeholder="Ex: Nous sommes ouverts du lundi au vendredi de 9h à 18h."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              L&apos;entrée sera enregistrée comme fichier texte et indexée automatiquement dans la base vectorielle.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setQuestion(""); setAnswer(""); }}>
              Annuler
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!question.trim() || !answer.trim() || saving}
            >
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée FAQ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier <span className="font-mono">{deleteTarget?.file.filename}</span> sera
              définitivement supprimé de la base vectorielle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
