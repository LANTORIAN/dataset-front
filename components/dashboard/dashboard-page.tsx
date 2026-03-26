"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, FileText, MessageSquare, Zap, ArrowRight } from "lucide-react";
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
