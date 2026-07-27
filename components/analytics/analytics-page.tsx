"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare, Zap, Clock, ThumbsUp, TrendingUp, TrendingDown,
  Minus, HelpCircle, AlertTriangle, Loader2, RefreshCw, Download,
  Bug,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { analyticsService } from "@/services/analytics.service";
import { projectsService } from "@/services/projects.service";
import type {
  Project,
  AnalyticsOverview,
  TopQuestion,
  FailedQuery,
  SatisfactionStats,
  ConversationIssues,
} from "@/types";

const DAYS_OPTIONS = [
  { label: "7 derniers jours", value: "7" },
  { label: "30 derniers jours", value: "30" },
  { label: "90 derniers jours", value: "90" },
];

const TREND_ICON = {
  improving: <TrendingUp className="size-4 text-success" />,
  declining:  <TrendingDown className="size-4 text-destructive" />,
  stable:     <Minus className="size-4 text-muted-foreground" />,
};

const TREND_LABEL = {
  improving: "En hausse",
  declining:  "En baisse",
  stable:     "Stable",
};

function fmt(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

export function AnalyticsPage() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [projectId, setProjectId]       = useState("");
  const [days, setDays]                 = useState("30");
  const [loading, setLoading]           = useState(false);
  const [overview, setOverview]         = useState<AnalyticsOverview | null>(null);
  const [satisfaction, setSatisfaction] = useState<SatisfactionStats | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [failedQueries, setFailedQueries] = useState<FailedQuery[]>([]);
  const [issues, setIssues] = useState<ConversationIssues | null>(null);

  // Load project list
  useEffect(() => {
    projectsService.list({ limit: 100 }).then((r) => {
      if (r.ok) {
        setProjects(r.data.projects);
        if (r.data.projects.length > 0) setProjectId(r.data.projects[0].id);
      }
    });
  }, []);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    const d = Number(days);
    const [ovR, satR, topR, failR, issuesR] = await Promise.all([
      analyticsService.projectOverview(projectId, d),
      analyticsService.satisfaction(projectId, d),
      analyticsService.topQuestions(projectId, 10, d),
      analyticsService.failedQueries(projectId, 20, d),
      analyticsService.conversationIssues(projectId, 10, d),
    ]);
    if (ovR.ok)   setOverview(ovR.data);
    if (satR.ok)  setSatisfaction(satR.data);
    if (topR.ok)  setTopQuestions(topR.data.questions ?? []);
    if (failR.ok) setFailedQueries(failR.data.queries ?? []);
    if (issuesR.ok) setIssues(issuesR.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId, days]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (!projectId) return;
    const r = await analyticsService.export(projectId, "csv", Number(days));
    if (r.ok) {
      const blob = new Blob([r.data as string], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `analytics_${projectId}_${days}j.csv`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Support</h2>
          <p className="text-sm text-muted-foreground">
            Performance et satisfaction de votre assistant IA
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
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-8" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={handleExport} disabled={!projectId}>
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !projectId ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          Sélectionnez un projet pour afficher les analytics.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" />Conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview?.total_conversations ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <Zap className="size-3.5" />Messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview?.total_messages ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <Clock className="size-3.5" />Tps de réponse moy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {overview ? fmt(overview.avg_response_time_ms) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <ThumbsUp className="size-3.5" />Satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {satisfaction ? pct(satisfaction.satisfaction_rate) : "—"}
                  </p>
                  {satisfaction && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {TREND_ICON[satisfaction.trend]}
                      {TREND_LABEL[satisfaction.trend]}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <Bug className="size-3.5" />Non résolus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{issues?.unresolved_messages ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {issues ? pct(issues.unresolved_rate) : "—"} des messages
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />Sans réponse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{issues?.unanswered_messages ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <HelpCircle className="size-3.5" />Incertaines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{issues?.uncertain_responses ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <ThumbsUp className="size-3.5" />Feedbacks négatifs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{issues?.negative_feedbacks ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <Clock className="size-3.5" />P95 latence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {issues ? fmt(issues.p95_response_time_ms) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Satisfaction detail */}
            {satisfaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ThumbsUp className="size-4" />Feedbacks
                  </CardTitle>
                  <CardDescription>{satisfaction.total_feedbacks} avis collectés</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-24 text-muted-foreground">Positifs</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-success h-full rounded-full transition-all"
                        style={{
                          width: satisfaction.total_feedbacks > 0
                            ? `${(satisfaction.positive_count / satisfaction.total_feedbacks) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">
                      {satisfaction.positive_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-24 text-muted-foreground">Négatifs</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-destructive h-full rounded-full transition-all"
                        style={{
                          width: satisfaction.total_feedbacks > 0
                            ? `${(satisfaction.negative_count / satisfaction.total_feedbacks) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">
                      {satisfaction.negative_count}
                    </span>
                  </div>
                  {satisfaction.total_feedbacks === 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Aucun feedback sur cette période.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {issues && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bug className="size-4" />Diagnostic conversations
                  </CardTitle>
                  <CardDescription>
                    {issues.total_user_messages} messages utilisateur analysés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Temps moyen</dt>
                      <dd className="font-medium">{fmt(issues.avg_response_time_ms)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Réponses sans certitude</dt>
                      <dd className="font-medium">{issues.uncertain_responses}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Messages sans réponse assistant</dt>
                      <dd className="font-medium">{issues.unanswered_messages}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Feedbacks négatifs</dt>
                      <dd className="font-medium">{issues.negative_feedbacks}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Overview extra stats */}
            {overview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="size-4" />Utilisation
                  </CardTitle>
                  <CardDescription>Métriques détaillées</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Messages / conversation</dt>
                      <dd className="font-medium">
                        {overview.avg_messages_per_conversation?.toFixed(1) ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Utilisateurs uniques</dt>
                      <dd className="font-medium">{overview.unique_users ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Taux utilisation RAG</dt>
                      <dd className="font-medium">
                        {overview.rag_usage_rate != null ? pct(overview.rag_usage_rate) : "—"}
                      </dd>
                    </div>
                    {overview.total_tokens_used != null && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tokens utilisés</dt>
                        <dd className="font-medium">
                          {overview.total_tokens_used.toLocaleString("fr-FR")}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="size-4" />Questions fréquentes
              </CardTitle>
              <CardDescription>Questions les plus posées sur {days} jours</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {topQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnée disponible.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-20 text-right">Nb</TableHead>
                      {topQuestions[0]?.avg_response_time_ms != null && (
                        <TableHead className="w-28 text-right">Tps rép.</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topQuestions.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm max-w-md truncate">{q.question}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">{q.count}</Badge>
                        </TableCell>
                        {q.avg_response_time_ms != null && (
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {fmt(q.avg_response_time_ms)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Failed queries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />Requêtes sans réponse
              </CardTitle>
              <CardDescription>Questions auxquelles l&apos;IA n&apos;a pas pu répondre</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {failedQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune requête échouée sur cette période.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requête</TableHead>
                      <TableHead className="w-32">Type d&apos;erreur</TableHead>
                      <TableHead className="w-16 text-right">Nb</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedQueries.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm max-w-md truncate">{q.query}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{q.error_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {q.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
