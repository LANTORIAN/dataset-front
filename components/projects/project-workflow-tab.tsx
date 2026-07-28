"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Settings2,
  Shield,
  Activity,
  Play,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Cpu,
  Database,
  Boxes,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workflowService } from "@/services/workflow.service";
import type {
  WorkflowSettings,
  WorkflowSettingsUpsert,
  WorkflowRolloutMode,
  AgentRun,
  WorkflowRolloutObservability,
  WorkflowEngineEvaluation,
  WorkflowCandidate,
  WorkflowReadiness,
} from "@/types";

interface Props {
  projectId: string;
}

const ROLLOUT_MODE_LABELS: Record<WorkflowRolloutMode, string> = {
  disabled: "Désactivé",
  shadow: "Shadow",
  canary: "Canary",
  active: "Actif",
};

const ROLLOUT_MODE_VARIANTS: Record<
  WorkflowRolloutMode,
  "secondary" | "outline" | "default" | "destructive"
> = {
  disabled: "secondary",
  shadow: "outline",
  canary: "default",
  active: "default",
};

const RUN_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="size-3.5 text-success" />,
  fallback: <AlertTriangle className="size-3.5 text-warning" />,
  failed: <XCircle className="size-3.5 text-destructive" />,
};

const READINESS_LABELS = {
  ready: "Prêt",
  degraded: "À surveiller",
  blocked: "Configuration requise",
} as const;

const CHECK_LABELS: Record<string, string> = {
  configuration: "Configuration",
  runtime: "Runtime v2",
  rollout: "Trafic public",
  snapshot: "Contexte projet",
  planner: "Planner LLM",
  sources: "Sources de données",
};

const CHECK_HELP: Record<string, string> = {
  configuration: "Activez le moteur v2 pour ce projet.",
  runtime: "Le runtime v2 doit être activé sur le backend.",
  rollout: "Aucune conversation n’est actuellement envoyée au moteur v2.",
  snapshot: "La configuration privée du projet n’a pas pu être préparée.",
  planner: "Ouvrez Configuration > Modèles LLM et configurez l’usage fast_agents.",
  sources: "Utilisez Fichiers ou Base de données pour ajouter une source métier prête.",
};

const FAILURE_LABELS: Record<string, string> = {
  planner_unavailable: "Le Planner n’a aucun provider disponible.",
  planner_global_deadline_exceeded: "Le Planner a dépassé son délai.",
  workflow_setup_failed: "Le contexte privé du projet n’a pas pu être construit.",
  workflow_precommit_failed: "Le moteur a rejeté le plan ou la réponse avant publication.",
  workflow_commit_failed: "La réponse était prête mais son enregistrement a échoué.",
};

export function ProjectWorkflowTab({ projectId }: Props) {
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [observability, setObservability] =
    useState<WorkflowRolloutObservability | null>(null);
  const [evaluation, setEvaluation] =
    useState<WorkflowEngineEvaluation | null>(null);
  const [candidates, setCandidates] = useState<WorkflowCandidate[]>([]);
  const [readiness, setReadiness] = useState<WorkflowReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runStatusFilter, setRunStatusFilter] = useState<string>("all");

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(null);
    const [configRes, readinessRes, runsRes, obsRes, evalRes, candRes] =
      await Promise.all([
      workflowService.getConfiguration(projectId),
      workflowService.getReadiness(projectId),
      workflowService.listRuns(projectId, { limit: 50 }),
      workflowService.getRolloutObservability(projectId),
      workflowService.getEvaluation(projectId),
      workflowService.listCandidates(projectId),
    ]);
    if (configRes.ok) setSettings(configRes.data.settings);
    if (readinessRes.ok) setReadiness(readinessRes.data);
    if (runsRes.ok) setRuns(runsRes.data);
    if (obsRes.ok) setObservability(obsRes.data);
    if (evalRes.ok) setEvaluation(evalRes.data);
    if (candRes.ok) setCandidates(candRes.data);
    if (!configRes.ok || !readinessRes.ok) {
      setLoadError("L’état du moteur n’a pas pu être chargé complètement.");
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (enabled: boolean) => {
    if (!settings) return;
    setSaving(true);
    const payload: WorkflowSettingsUpsert = {
      expected_revision: settings.revision,
      is_enabled: enabled,
      shadow_mode: false,
      rollout_mode: enabled ? "canary" : "disabled",
      canary_sample_rate: enabled ? 1 : 0,
      canary_fallback_policy: "never",
    };
    const result = await workflowService.updateSettings(projectId, payload);
    setSaving(false);
    if (result.ok) {
      setSettings(result.data);
      await load(true);
    }
  };

  const handleUpdateShadowRate = async (rate: number) => {
    if (!settings) return;
    setSaving(true);
    const payload: WorkflowSettingsUpsert = {
      expected_revision: settings.revision,
      shadow_sample_rate: rate,
    };
    const result = await workflowService.updateSettings(projectId, payload);
    setSaving(false);
    if (result.ok) setSettings(result.data);
  };

  const filteredRuns =
    runStatusFilter === "all"
      ? runs
      : runs.filter((r) => r.status === runStatusFilter);
  const blockedChecks = readiness?.checks.filter((check) => check.status === "blocked") ?? [];
  const warningChecks = readiness?.checks.filter((check) => check.status === "warning") ?? [];
  const plannerCheck = readiness?.checks.find((check) => check.key === "planner");
  const latestOutcome = readiness?.recent_outcomes[0];
  const readinessStatus = readiness?.status ?? "blocked";
  const canEnableV2 = blockedChecks.some((check) =>
    ["configuration", "rollout"].includes(check.key)
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-10 w-full max-w-md rounded-lg" />
        <Card>
          <CardHeader><div className="skeleton h-5 w-48 rounded" /></CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className={readinessStatus === "blocked" ? "border-destructive/40" : "border-border"}>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">Moteur agentique</CardTitle>
              <Badge
                variant={
                  readinessStatus === "blocked"
                    ? "destructive"
                    : readinessStatus === "ready"
                      ? "default"
                      : "outline"
                }
              >
                {READINESS_LABELS[readinessStatus]}
              </Badge>
            </div>
            <CardDescription className="max-w-2xl">
              État réel du moteur public v2 pour ce projet. Les détails de certification restent masqués tant qu’une action n’est pas nécessaire.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {settings && canEnableV2 && (
              <Button
                size="sm"
                onClick={() => void handleToggle(true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Activer v2
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => void load(true)}
              disabled={refreshing}
              aria-label="Actualiser l’état du moteur"
              title="Actualiser"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              {loadError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Cpu className="size-4" /> Service public
              </div>
              <p className="text-xl font-semibold">
                {readiness?.can_accept_public_v2 ? "Disponible" : "Bloqué"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mode {readiness ? ROLLOUT_MODE_LABELS[readiness.rollout_mode] : "inconnu"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Activity className="size-4" /> Trafic v2
              </div>
              <p className="text-xl font-semibold">
                {Math.round((readiness?.canary_sample_rate ?? 0) * 100)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sans fallback legacy</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Database className="size-4" /> Sources prêtes
              </div>
              <p className="text-xl font-semibold">
                {readiness?.source_ready_count ?? 0}/{readiness?.source_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sources projet disponibles</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Boxes className="size-4" /> Intelligence
              </div>
              <p className="text-xl font-semibold">
                {plannerCheck?.status === "ready" ? "Prête" : "À configurer"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {readiness?.capability_count ?? 0} capacité(s) métier disponible(s)
              </p>
            </div>
          </div>

          {(blockedChecks.length > 0 || warningChecks.length > 0) && (
            <div className="grid gap-2 md:grid-cols-2">
              {[...blockedChecks, ...warningChecks].map((check) => (
                <div
                  key={check.key}
                  className="flex gap-3 rounded-lg border px-3 py-2.5 text-sm"
                >
                  {check.status === "blocked" ? (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{CHECK_LABELS[check.key] ?? check.key}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {CHECK_HELP[check.key] ?? check.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestOutcome && latestOutcome.delivery !== "engine" && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Dernière réponse v2 non publiée</p>
                <p className="text-xs text-muted-foreground">
                  {FAILURE_LABELS[latestOutcome.reason_code] ?? "Le moteur a arrêté la réponse avant sa publication."}
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(latestOutcome.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="settings">
            <Settings2 className="size-3.5 mr-1.5" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="runs">
            <Activity className="size-3.5 mr-1.5" />
            Exécutions
          </TabsTrigger>
          <TabsTrigger value="certification">
            <Shield className="size-3.5 mr-1.5" />
            Qualité
          </TabsTrigger>
          <TabsTrigger value="observability">
            <Play className="size-3.5 mr-1.5" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* ── Settings ──────────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {settings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Workflow Engine
                  </CardTitle>
                  <CardDescription>
                    Configuration du moteur de workflow agentique
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Répondre avec le moteur v2</Label>
                      <p className="text-xs text-muted-foreground">
                        Envoie toutes les conversations au moteur unifié, sans fallback legacy.
                      </p>
                    </div>
                    <Switch
                      checked={settings.is_enabled}
                      onCheckedChange={handleToggle}
                      disabled={
                        saving ||
                        settings.rollout_mode === "active" ||
                        Boolean(settings.evaluation_window_id)
                      }
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Mode
                      </Label>
                      <Badge
                        variant={
                          ROLLOUT_MODE_VARIANTS[settings.rollout_mode]
                        }
                        className="mt-1"
                      >
                        {ROLLOUT_MODE_LABELS[settings.rollout_mode]}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Révision
                      </Label>
                      <p className="text-sm font-mono mt-1">
                        {settings.revision}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Engine
                      </Label>
                      <p className="text-sm font-mono mt-1">
                        {settings.engine_version}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Deadline (ms)
                      </Label>
                      <p className="text-sm font-mono mt-1">
                        {settings.execution_deadline_ms}
                      </p>
                    </div>
                  </div>

                  {settings.rollout_mode === "shadow" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Taux d&apos;échantillonnage shadow</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={settings.shadow_sample_rate}
                          onChange={(e) =>
                            handleUpdateShadowRate(
                              parseFloat(e.target.value) || 0.1
                            )
                          }
                          className="w-24 h-8"
                          disabled={saving}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(settings.shadow_sample_rate * 100)}% des
                          requêtes
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Quality Policy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Send</span>
                      <span className="font-mono">
                        {settings.quality_policy.send_threshold}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regenerate</span>
                      <span className="font-mono">
                        {settings.quality_policy.regenerate_threshold}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clarify</span>
                      <span className="font-mono">
                        {settings.quality_policy.clarify_threshold}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Safety Policy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Expose sources
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {settings.safety_policy.expose_source_summaries
                          ? "Oui"
                          : "Non"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Public SQL</span>
                      <Badge variant="outline" className="text-xs">
                        {settings.safety_policy.allow_public_sql
                          ? "Oui"
                          : "Non"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Explanations
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {settings.safety_policy.expose_explanations
                          ? "Oui"
                          : "Non"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Runs ──────────────────────────────────────────────────── */}
        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Runs récents</CardTitle>
                <CardDescription>
                  Exécutions du moteur workflow
                </CardDescription>
              </div>
              <Select
                value={runStatusFilter}
                onValueChange={setRunStatusFilter}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="fallback">Fallback</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {filteredRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Activity className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    Aucun run enregistré
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {runStatusFilter !== "all"
                      ? "Aucun run avec ce statut. Modifiez le filtre."
                      : "Les exécutions du workflow apparaîtront ici une fois le moteur activé."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>LLM calls</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {RUN_STATUS_ICON[run.status] ?? (
                              <Clock className="size-3.5 text-muted-foreground" />
                            )}
                            <span className="text-xs">{run.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {run.run_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate">
                          {run.decision_path}
                        </TableCell>
                        <TableCell className="text-xs">
                          {run.provider ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {run.duration_ms}ms
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {run.llm_call_count}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certification ─────────────────────────────────────────── */}
        <TabsContent value="certification" className="mt-4 space-y-4">
          {evaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Évaluation Canary
                </CardTitle>
                <CardDescription>
                  Métriques non-autoritatives du moteur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Éligible
                    </Label>
                    <div className="mt-1">
                      {evaluation.eligible_for_active ? (
                        <Badge variant="default" className="text-xs">
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Non
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Runs
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {evaluation.run_count}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Failure rate
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {(evaluation.failure_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      P95 latency
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {evaluation.p95_latency_ms.toFixed(0)}ms
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Quality avg
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {evaluation.average_quality.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Quality runs
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {evaluation.quality_run_count}
                    </p>
                  </div>
                </div>
                {evaluation.failed_checks.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <Label className="text-xs text-muted-foreground">
                      Checks échoués
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {evaluation.failed_checks.map((check) => (
                        <Badge
                          key={check}
                          variant="destructive"
                          className="text-xs"
                        >
                          {check}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Candidats</CardTitle>
              <CardDescription>
                Snapshots de configuration candidats à la certification
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Shield className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    Aucun candidat créé
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Les snapshots de configuration candidats à la certification apparaîtront ici.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Engine</TableHead>
                      <TableHead>Créé par</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((c) => (
                      <TableRow key={c.candidate_id}>
                        <TableCell className="font-mono text-xs max-w-[100px] truncate">
                          {c.candidate_id}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[100px] truncate">
                          {c.candidate_hash}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.manifest.engine_version}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.created_by ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Rollout Observability ──────────────────────────────────── */}
        <TabsContent value="observability" className="mt-4">
          {observability && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Rollout Observability
                </CardTitle>
                <CardDescription>
                  État en temps réel du déploiement progressif
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Mode
                    </Label>
                    <Badge
                      variant={
                        ROLLOUT_MODE_VARIANTS[observability.rollout_mode]
                      }
                      className="mt-1"
                    >
                      {ROLLOUT_MODE_LABELS[observability.rollout_mode]}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Génération
                    </Label>
                    <p className="text-sm font-mono mt-1">
                      {observability.rollout_generation}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Controller
                    </Label>
                    <div className="mt-1">
                      {observability.controller_healthy ? (
                        <Badge variant="default" className="text-xs">
                          Healthy
                        </Badge>
                      ) : observability.controller_running ? (
                        <Badge variant="outline" className="text-xs">
                          Running
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Stopped
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Legacy
                    </Label>
                    <Badge
                      variant={
                        observability.legacy_protocol_enabled
                          ? "outline"
                          : "secondary"
                      }
                      className="mt-1 text-xs"
                    >
                      {observability.legacy_protocol_enabled
                        ? "Actif"
                        : "Retiré"}
                    </Badge>
                  </div>
                </div>

                {observability.events.length > 0 && (
                  <div className="pt-3 border-t">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Événements récents
                    </Label>
                    <div className="space-y-2">
                      {observability.events.slice(0, 10).map((evt) => (
                        <div
                          key={evt.event_id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <ChevronRight className="size-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">
                            {evt.from_mode} → {evt.to_mode}
                          </Badge>
                          <span className="font-mono text-muted-foreground">
                            {evt.reason_code}
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {new Date(evt.created_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
