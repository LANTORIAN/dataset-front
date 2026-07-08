"use client";

import { useState } from "react";
import { Save, Bot, Building2, Globe, Cpu, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { projectsService } from "@/services/projects.service";
import type { Project } from "@/types";

interface Props {
  project: Project;
  onSaved: (updated: Project) => void;
}

export function ProjectConfigForm({ project, onSaved }: Props) {
  const cfg = project.config;

  const [name, setName]                       = useState(project.name);
  const [description, setDescription]         = useState(project.description ?? "");
  const [assistantName, setAssistantName]     = useState(cfg?.assistant_name ?? "");
  const [companyName, setCompanyName]         = useState(cfg?.company_name ?? "");
  const [assistantRole, setAssistantRole]     = useState(cfg?.assistant_role ?? "");
  const [assistantTone, setAssistantTone]     = useState(cfg?.assistant_tone ?? "");
  const [maxCtx, setMaxCtx]                   = useState(String(cfg?.max_context_messages ?? 10));
  const [saving, setSaving]                   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await projectsService.update(project.id, {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      assistant_name: assistantName.trim() || undefined,
      company_name: companyName.trim() || undefined,
      assistant_role: assistantRole.trim() || undefined,
      assistant_tone: assistantTone.trim() || undefined,
      max_context_messages: parseInt(maxCtx, 10) || undefined,
    });
    if (result.ok) onSaved(result.data);
    setSaving(false);
  };

  return (
    <div className="space-y-4">

      {/* Projet */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="size-4" />Projet
          </CardTitle>
          <CardDescription className="text-xs">Nom et description du dataset.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom du projet</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-sm" placeholder="Optionnelle" />
          </div>
        </CardContent>
      </Card>

      {/* Assistant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="size-4" />Assistant IA
          </CardTitle>
          <CardDescription className="text-xs">Identité et comportement de l&apos;assistant.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom de l&apos;assistant</Label>
            <Input value={assistantName} onChange={(e) => setAssistantName(e.target.value)} className="h-8 text-sm" placeholder="Assistant" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nom de l&apos;entreprise</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-8 text-sm" placeholder="Company" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rôle de l&apos;assistant</Label>
            <Input value={assistantRole} onChange={(e) => setAssistantRole(e.target.value)} className="h-8 text-sm" placeholder="assistant" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ton de communication</Label>
            <Select value={assistantTone} onValueChange={setAssistantTone}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choisir un ton…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professionnel et clair">Professionnel</SelectItem>
                <SelectItem value="amical et décontracté">Amical</SelectItem>
                <SelectItem value="formel et précis">Formel</SelectItem>
                <SelectItem value="pédagogique et patient">Pédagogique</SelectItem>
                <SelectItem value="concis et direct">Concis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Historique de conversation (messages)</Label>
            <Select value={maxCtx} onValueChange={setMaxCtx}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 30, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} messages</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres avancés (lecture seule) */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="size-4" />Paramètres avancés
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Info className="size-3" />Configuration backend uniquement
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Ces paramètres sont gérés directement dans la configuration serveur du projet.
            Ils ne sont pas modifiables depuis cette interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Modèle LLM",        value: cfg?.model ?? "llama3.2:3b" },
            { label: "Température",       value: cfg?.temperature != null ? String(cfg.temperature) : "0.7" },
            { label: "Max tokens",        value: cfg?.max_tokens != null ? String(cfg.max_tokens) : "2000" },
            { label: "Recherche web",     value: cfg?.enable_web_search ? "Activée" : "Désactivée" },
            { label: "Comportement fallback", value: cfg?.fallback_behavior ?? "internet_search" },
            { label: "Langue",            value: cfg?.default_language ?? "fr" },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input value={value} disabled className="h-8 text-xs opacity-60" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sources de connaissance */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="size-4" />Sources de connaissance
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Info className="size-3" />Configuration backend uniquement
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Le pipeline RAG gère automatiquement les sources selon leur disponibilité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "Fichiers indexés (RAG)", active: true, desc: "PDF, MD, TXT, DOCX, CSV, HTML" },
              { label: "Recherche web",          active: cfg?.enable_web_search ?? true, desc: "Fallback si RAG sans résultat" },
              { label: "Génération LLM",         active: true, desc: `Modèle : ${cfg?.model ?? "llama3.2:3b"}` },
            ].map(({ label, active, desc }) => (
              <div key={label} className={`rounded-md border p-3 text-xs space-y-0.5 ${active ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-muted-foreground"}`} />
                  {label}
                </div>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
