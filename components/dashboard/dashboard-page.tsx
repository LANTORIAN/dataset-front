"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Database, FileText, FolderOpen, GitBranch, Globe2, MessageSquare, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsService } from "@/services/projects.service";
import { analyticsService } from "@/services/analytics.service";
import { ragFilesService } from "@/services/rag-files.service";
import type { Project } from "@/types";

const STAT_CARDS = [
  { title: "Projets",          icon: FolderOpen,   color: "text-chart-1", bg: "bg-chart-1-surface", href: "/projects" },
  { title: "Fichiers indexés", icon: FileText,      color: "text-chart-2", bg: "bg-chart-2-surface", href: "/projects" },
  { title: "Conversations",    icon: MessageSquare, color: "text-chart-3", bg: "bg-chart-3-surface", href: "/chat"     },
  { title: "Requêtes IA",      icon: Zap,           color: "text-chart-4", bg: "bg-chart-4-surface", href: "/chat"     },
];

const AGENTIC_MODULES = [
  { label: "RAG", detail: "documents indexés", icon: FileText },
  { label: "SQL", detail: "bases projet", icon: Database },
  { label: "APIs", detail: "sources externes", icon: Globe2 },
  { label: "Planner", detail: "routage dynamique", icon: GitBranch },
  { label: "Actions", detail: "marketplace", icon: ShoppingBag },
  { label: "Guardrails", detail: "preuves & conflits", icon: ShieldCheck },
];

export function DashboardPage() {
  const [projects, setProjects]            = useState<Project[]>([]);
  const [totalConversations, setTotalConv]  = useState<number | null>(null);
  const [totalMessages, setTotalMsg]        = useState<number | null>(null);
  const [totalFiles, setTotalFiles]         = useState<number | null>(null);
  const [loading, setLoading]              = useState(true);

  useEffect(() => {
    Promise.all([
      projectsService.list().then(async (r) => {
        if (!r.ok) return;
        setProjects(r.data.projects);
        // Sum file counts across all projects (Bearer JWT is accepted)
        const counts = await Promise.all(
          r.data.projects.map((p) => ragFilesService.count(p.id))
        );
        setTotalFiles(counts.reduce((sum, c) => sum + (c.ok ? c.data : 0), 0));
      }),
      analyticsService.overview().then((r) => {
        if (r.ok) {
          setTotalConv(r.data.total_conversations);
          setTotalMsg(r.data.total_messages);
        }
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = [
    projects.length,
    totalFiles ?? "—",
    totalConversations ?? "—",
    totalMessages ?? "—",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bienvenue</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos datasets et interagissez avec votre IA en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STAT_CARDS.map((card, i) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`rounded-md p-1.5 ${card.bg}`}>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? "…" : stats[i]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-background via-muted/30 to-primary/10">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Bot className="size-3.5" /> Agentique multi-module actif
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Une réponse, plusieurs moteurs coordonnés.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Le backend peut router chaque demande vers les fichiers RAG, la base SQL en lecture seule,
                  les APIs de connaissance, la mémoire de suivi DB et les recommandations marketplace, puis afficher les preuves utilisées.
                </p>
              </div>
              <Button asChild size="sm" className="gap-2">
                <Link href="/chat"><MessageSquare className="size-4" /> Tester dans le chat</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-background/45 p-4 lg:border-l lg:border-t-0">
              {AGENTIC_MODULES.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm">
                  <item.icon className="mb-2 size-4 text-primary" />
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projets récents</CardTitle>
            <CardDescription>Vos derniers datasets importés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />)
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun projet pour l&apos;instant</p>
            ) : (
              projects.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-md p-2 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                      {p.is_active ? "actif" : "inactif"}
                    </Badge>
                    <ArrowRight className="size-3 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/projects">Voir tous les projets</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Démarrage rapide</CardTitle>
            <CardDescription>Les actions les plus courantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start gap-2" variant="outline">
              <Link href="/projects"><FolderOpen className="size-4" />Créer un nouveau projet</Link>
            </Button>
            <Button asChild className="w-full justify-start gap-2" variant="outline">
              <Link href="/projects"><FileText className="size-4" />Importer des fichiers</Link>
            </Button>
            <Button asChild className="w-full justify-start gap-2" variant="outline">
              <Link href="/chat"><MessageSquare className="size-4" />Démarrer une conversation</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
