"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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
import type { WorkflowSettings, WorkflowSettingsUpsert } from "@/types";

interface Props {
  projectId: string;
}

export function ProjectWorkflowTab({ projectId }: Props) {
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    const result = await workflowService.getConfiguration(projectId);
    if (result.ok) {
      setSettings(result.data.settings);
    } else {
      setError("La configuration de l’agent n’a pas pu être chargée.");
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

  return (
    <Card>
      <CardHeader className="gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Bot className="size-5" />
            </div>
            <CardTitle className="text-lg">Agent agentique</CardTitle>
            <Badge variant={enabled ? "default" : "secondary"}>
              {enabled ? "Actif" : "Désactivé"}
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
                ? "Le chat appelle le moteur v2 directement."
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

        {enabled && (
          <div className="flex gap-3 rounded-lg border px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p className="font-medium">Agent activé</p>
              <p className="text-muted-foreground">
                Le chat et l’historique utilisent exclusivement le contrat public v2.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
