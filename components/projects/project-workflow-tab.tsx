"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { workflowService } from "@/services/workflow.service";
import type {
  WorkflowReadiness,
  WorkflowSettings,
  WorkflowSettingsUpsert,
} from "@/types";

interface Props {
  projectId: string;
}

const CHECK_LABELS: Record<string, string> = {
  configuration: "Activation",
  runtime: "Runtime agentique",
  rollout: "Accès public",
  snapshot: "Contexte du projet",
  planner: "Planner LLM",
  sources: "Sources de données",
};

const CHECK_HELP: Record<string, string> = {
  configuration: "Activez l’agent pour ce projet.",
  runtime: "Le runtime agentique doit être activé sur le backend.",
  rollout: "Le backend n’autorise pas encore les conversations publiques.",
  snapshot: "Le contexte privé du projet n’a pas pu être préparé.",
  planner: "Configurez l’usage fast_agents dans Configuration > Modèles LLM.",
  sources: "Ajoutez une source dans Connaissances ou Données.",
};

const FAILURE_LABELS: Record<string, string> = {
  planner_unavailable: "Aucun provider Planner n’est disponible.",
  planner_global_deadline_exceeded: "Le Planner a dépassé son délai.",
  planner_contract_invalid: "Le Planner n’a pas produit un plan valide.",
  workflow_setup_failed: "Le contexte du projet n’a pas pu être construit.",
  workflow_precommit_failed: "Le plan a été rejeté avant publication.",
  workflow_commit_failed: "La réponse n’a pas pu être enregistrée.",
};

export function ProjectWorkflowTab({ projectId }: Props) {
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [readiness, setReadiness] = useState<WorkflowReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    const [configurationResult, readinessResult] = await Promise.all([
      workflowService.getConfiguration(projectId),
      workflowService.getReadiness(projectId),
    ]);
    if (configurationResult.ok) {
      setSettings(configurationResult.data.settings);
    } else {
      setError("La configuration de l’agent n’a pas pu être chargée.");
    }
    setReadiness(readinessResult.ok ? readinessResult.data : null);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (enabled: boolean) => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    const payload: WorkflowSettingsUpsert = {
      expected_revision: settings.revision,
      is_enabled: enabled,
      shadow_mode: false,
      rollout_mode: enabled ? "canary" : "disabled",
      canary_sample_rate: enabled ? 1 : 0,
      canary_fallback_policy: "never",
    };
    const result = await workflowService.updateSettings(projectId, payload);
    if (result.ok) {
      setSettings(result.data);
      await load(true);
    } else {
      setError("La configuration de l’agent n’a pas pu être mise à jour.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const enabled = Boolean(
    settings?.is_enabled &&
      settings.rollout_mode !== "disabled" &&
      settings.rollout_mode !== "shadow"
  );
  const blockedChecks =
    readiness?.checks.filter((check) => check.status === "blocked") ?? [];
  const warningChecks =
    readiness?.checks.filter((check) => check.status === "warning") ?? [];
  const plannerReady =
    readiness?.checks.find((check) => check.key === "planner")?.status === "ready";
  const latestFailure = readiness?.recent_outcomes.find(
    (outcome) => outcome.delivery !== "engine"
  );
  const status = !enabled
    ? "disabled"
    : readiness && !readiness.can_accept_public_v2
      ? "blocked"
      : "active";

  return (
    <Card className={status === "blocked" ? "border-destructive/40" : undefined}>
      <CardHeader className="gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Bot className="size-5" />
            </div>
            <CardTitle className="text-lg">Agent agentique</CardTitle>
            <Badge
              variant={
                status === "blocked"
                  ? "destructive"
                  : status === "active"
                    ? "default"
                    : "secondary"
              }
            >
              {status === "blocked"
                ? "Action requise"
                : status === "active"
                  ? "Actif"
                  : "Désactivé"}
            </Badge>
          </div>
          <CardDescription className="max-w-2xl">
            Toutes les conversations utilisent directement le moteur agentique v2,
            sans négociation préalable ni fallback legacy.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => void load(true)}
          disabled={refreshing}
          aria-label="Actualiser l’état de l’agent"
          title="Actualiser"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-6 rounded-xl border bg-muted/20 p-4">
          <div>
            <p className="font-medium">Utiliser l’agent agentique</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {enabled
                ? "Le chat appelle v2 directement."
                : "Activez l’agent pour répondre aux conversations."}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving || !settings || settings.rollout_mode === "active"}
            aria-label="Utiliser l’agent agentique"
          />
        </div>

        {enabled && !readiness && (
          <div className="flex gap-3 rounded-lg border px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p className="font-medium">Agent activé</p>
              <p className="text-muted-foreground">
                Le diagnostic détaillé est indisponible, mais il ne bloque plus le chat.
              </p>
            </div>
          </div>
        )}

        {readiness && enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BrainCircuit className="size-4" /> Intelligence
              </div>
              <p className="mt-2 font-semibold">
                {plannerReady ? "Planner prêt" : "Planner à vérifier"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="size-4" /> Sources
              </div>
              <p className="mt-2 font-semibold">
                {readiness.source_ready_count}/{readiness.source_count} prêtes
              </p>
            </div>
          </div>
        )}

        {enabled && [...blockedChecks, ...warningChecks].length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...blockedChecks, ...warningChecks].map((check) => (
              <div key={check.key} className="flex gap-3 rounded-lg border px-4 py-3 text-sm">
                {check.status === "blocked" ? (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                <div>
                  <p className="font-medium">{CHECK_LABELS[check.key] ?? check.key}</p>
                  <p className="text-muted-foreground">
                    {CHECK_HELP[check.key] ?? check.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {enabled && latestFailure && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Dernière réponse interrompue</p>
              <p className="text-muted-foreground">
                {FAILURE_LABELS[latestFailure.reason_code] ??
                  "Le moteur a arrêté la réponse avant sa publication."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
