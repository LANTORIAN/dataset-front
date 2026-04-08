"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ChevronDown, ChevronUp, Copy, Check,
  KeyRound, AlertTriangle, Server,
} from "lucide-react";
import { projectsService } from "@/services/projects.service";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface Props {
  onCreated: (project: Project) => void;
}

// ── Étape 1 : formulaire ──────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  assistant_name: string;
  company_name: string;
  assistant_role: string;
  assistant_tone: string;
  max_context_messages: number;
}

const DEFAULTS: FormState = {
  name: "",
  description: "",
  assistant_name: "Assistant",
  company_name: "Company",
  assistant_role: "assistant",
  assistant_tone: "professionnel et clair",
  max_context_messages: 10,
};

// ── Component ─────────────────────────────────────────────────────────────

export function CreateProjectDialog({ onCreated }: Props) {
  const [open, setOpen]             = useState(false);
  const [form, setForm]             = useState<FormState>(DEFAULTS);
  const [loading, setLoading]       = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Étape 2 : clé API affichée une seule fois
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [copiedField, setCopiedField]       = useState<string | null>(null);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    const result = await projectsService.create({
      name:                  form.name.trim(),
      description:           form.description.trim() || undefined,
      assistant_name:        form.assistant_name.trim() || undefined,
      company_name:          form.company_name.trim() || undefined,
      assistant_role:        form.assistant_role.trim() || undefined,
      assistant_tone:        form.assistant_tone.trim() || undefined,
      max_context_messages:  Number(form.max_context_messages),
    });
    setLoading(false);
    if (result.ok) {
      setCreatedProject(result.data);
      onCreated(result.data);
    }
  };

  const copyValue = async (field: string, value?: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setOpen(false);
      setForm(DEFAULTS);
      setCreatedProject(null);
      setCopiedField(null);
      setShowAdvanced(false);
    } else {
      setOpen(true);
    }
  };

  const composeSnippet = createdProject
    ? `services:\n  local-agent:\n    image: bluevaloris/local-agent:latest\n    restart: unless-stopped\n    environment:\n      PROJECT_ID: "${createdProject.id}"\n      AGENT_TOKEN: "${createdProject.agent_token ?? "<REQUIRED>"}"\n      BACKEND_URL: "https://api-mind.bluevaloris.com"\n      DB_TYPE: "postgres"\n      DB_HOST: "postgres"\n      DB_PORT: "5432"\n      DB_NAME: "your_database"\n      DB_USER: "readonly_user"\n      DB_PASSWORD: "<SECRET>"\n      DB_SSLMODE: "require"`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          Nouveau projet
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ── Étape 2 : clé révélée ── */}
        {createdProject ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Projet créé — sauvegardez votre clé API
              </DialogTitle>
              <DialogDescription>
                Cette clé ne sera <strong>plus jamais affichée</strong>. Copiez-la maintenant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-2 rounded-lg border border-warning-surface-border bg-warning-surface p-3">
                <AlertTriangle className="size-4 text-warning-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-warning-surface-foreground leading-relaxed">
                  Stockez ces secrets dans un gestionnaire de secrets ou des variables d&apos;environnement.
                  Chaque projet possede son propre `project_id`, sa cle API et son token agent.
                </p>
              </div>

              {/* Project info */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projet</p>
                <p className="font-semibold">{createdProject.name}</p>
                {createdProject.description && (
                  <p className="text-sm text-muted-foreground">{createdProject.description}</p>
                )}
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Project ID</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all leading-relaxed">
                      {createdProject.id}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("size-9 shrink-0", copiedField === "project_id" && "border-success text-success")}
                      onClick={() => copyValue("project_id", createdProject.id)}
                    >
                      {copiedField === "project_id" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cle API publique projet</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all leading-relaxed">
                      {createdProject.api_key ?? "—"}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("size-9 shrink-0", copiedField === "api_key" && "border-success text-success")}
                      onClick={() => copyValue("api_key", createdProject.api_key)}
                      disabled={!createdProject.api_key}
                    >
                      {copiedField === "api_key" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Token agent local</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all leading-relaxed">
                      {createdProject.agent_token ?? "—"}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("size-9 shrink-0", copiedField === "agent_token" && "border-success text-success")}
                      onClick={() => copyValue("agent_token", createdProject.agent_token)}
                      disabled={!createdProject.agent_token}
                    >
                      {copiedField === "agent_token" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <p className="text-xs font-medium">Boilerplate Docker local-agent</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copiez ce bloc dans le `docker-compose.yml` du client pour connecter sa base interne.
                </p>
                <pre className="rounded-md border bg-background p-3 text-[11px] overflow-auto">
                  {composeSnippet}
                </pre>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("gap-2", copiedField === "compose" && "border-success text-success")}
                    onClick={() => copyValue("compose", composeSnippet)}
                    disabled={!composeSnippet}
                  >
                    {copiedField === "compose" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    Copier le boilerplate
                  </Button>
                </div>
              </div>

              {/* Config recap */}
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Configuration IA</p>
                {[
                  ["Assistant",   createdProject.config?.assistant_name],
                  ["Entreprise",  createdProject.config?.company_name],
                  ["Rôle",        createdProject.config?.assistant_role],
                  ["Ton",         createdProject.config?.assistant_tone],
                  ["Contexte",    createdProject.config?.max_context_messages
                    ? `${createdProject.config.max_context_messages} messages`
                    : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <Badge variant="secondary" className="text-xs h-4">{String(value)}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)} className="w-full">
                J&apos;ai copie les secrets — Fermer
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ── Étape 1 : formulaire ── */
          <>
            <DialogHeader>
              <DialogTitle>Créer un projet</DialogTitle>
              <DialogDescription>
                Un projet regroupe vos fichiers de données et configure le comportement de l&apos;IA.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Champs principaux */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom du projet <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="Mon dataset" value={form.name}
                  onChange={set("name")} required maxLength={255} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Description optionnelle…" value={form.description}
                  onChange={set("description")} rows={2} />
              </div>

              <Separator />

              {/* Section avancée */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Configuration IA</span>
                {showAdvanced
                  ? <ChevronUp className="size-4" />
                  : <ChevronDown className="size-4" />}
              </button>

              {showAdvanced && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="assistant_name" className="text-xs">Nom de l&apos;assistant</Label>
                      <Input id="assistant_name" placeholder="Assistant" value={form.assistant_name}
                        onChange={set("assistant_name")} maxLength={100} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company_name" className="text-xs">Nom de l&apos;entreprise</Label>
                      <Input id="company_name" placeholder="Company" value={form.company_name}
                        onChange={set("company_name")} maxLength={255} className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assistant_role" className="text-xs">Rôle de l&apos;assistant</Label>
                    <Input id="assistant_role" placeholder="assistant" value={form.assistant_role}
                      onChange={set("assistant_role")} maxLength={255} className="h-8 text-sm" />
                    <p className="text-xs text-muted-foreground">
                      Ex : support client, expert technique, conseiller commercial…
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assistant_tone" className="text-xs">Ton de l&apos;assistant</Label>
                    <Input id="assistant_tone" placeholder="professionnel et clair" value={form.assistant_tone}
                      onChange={set("assistant_tone")} maxLength={255} className="h-8 text-sm" />
                    <p className="text-xs text-muted-foreground">
                      Ex : formel, décontracté, empathique, concis…
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="max_context_messages" className="text-xs">
                      Messages de contexte max{" "}
                      <span className="text-muted-foreground">(1 – 50)</span>
                    </Label>
                    <Input
                      id="max_context_messages"
                      type="number"
                      min={1}
                      max={50}
                      value={form.max_context_messages}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          max_context_messages: Math.min(50, Math.max(1, Number(e.target.value))),
                        }))
                      }
                      className="h-8 text-sm w-24"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading || !form.name.trim()}>
                  {loading ? "Création…" : "Créer le projet"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
