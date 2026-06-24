"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  Database,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Table2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { projectSqlService } from "@/services/project-sql.service";
import type {
  CreateProjectSqlAliasPayload,
  CreateProjectSqlExamplePayload,
  ProjectSchemaCache,
  ProjectSqlAgentSettings,
  ProjectSqlAlias,
  ProjectSqlExample,
  ProjectSqlProvider,
  UpsertProjectSqlAgentSettingsPayload,
} from "@/types";

interface Props {
  projectId: string;
}

const DEFAULT_SETTINGS: UpsertProjectSqlAgentSettingsPayload = {
  is_enabled: false,
  shadow_mode: true,
  provider: "hybrid",
  model_name: null,
  temperature: null,
  max_context_tables: 12,
  max_examples: 20,
  auto_refresh_schema: true,
  schema_cache_ttl_seconds: 300,
};

const DEFAULT_ALIAS: CreateProjectSqlAliasPayload = {
  alias: "",
  target_type: "table",
  target_name: "",
  table_name: "",
  notes: "",
};

const DEFAULT_EXAMPLE: CreateProjectSqlExamplePayload = {
  question: "",
  sql_query: "",
  rationale: "",
  tables_used: [],
  tags: [],
  is_active: true,
};

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function ProjectSqlTab({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshingSchema, setRefreshingSchema] = useState(false);
  const [settings, setSettings] = useState<UpsertProjectSqlAgentSettingsPayload>(DEFAULT_SETTINGS);
  const [settingsMeta, setSettingsMeta] = useState<ProjectSqlAgentSettings | null>(null);
  const [aliases, setAliases] = useState<ProjectSqlAlias[]>([]);
  const [examples, setExamples] = useState<ProjectSqlExample[]>([]);
  const [schemaCache, setSchemaCache] = useState<ProjectSchemaCache | null>(null);
  const [aliasForm, setAliasForm] = useState<CreateProjectSqlAliasPayload>(DEFAULT_ALIAS);
  const [exampleForm, setExampleForm] = useState({
    ...DEFAULT_EXAMPLE,
    tables_used_raw: "",
    tags_raw: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [settingsResult, aliasesResult, examplesResult, schemaResult] = await Promise.all([
        projectSqlService.getSettings(projectId),
        projectSqlService.listAliases(projectId),
        projectSqlService.listExamples(projectId),
        projectSqlService.getSchemaCache(projectId),
      ]);

      if (cancelled) return;

      if (settingsResult.ok) {
        setSettingsMeta(settingsResult.data);
        setSettings({
          is_enabled: settingsResult.data.is_enabled,
          shadow_mode: settingsResult.data.shadow_mode,
          provider: settingsResult.data.provider,
          model_name: settingsResult.data.model_name,
          temperature: settingsResult.data.temperature,
          max_context_tables: settingsResult.data.max_context_tables,
          max_examples: settingsResult.data.max_examples,
          auto_refresh_schema: settingsResult.data.auto_refresh_schema,
          schema_cache_ttl_seconds: settingsResult.data.schema_cache_ttl_seconds,
        });
      } else {
        setSettingsMeta(null);
        setSettings(DEFAULT_SETTINGS);
      }

      if (aliasesResult.ok) setAliases(aliasesResult.data.aliases);
      if (examplesResult.ok) setExamples(examplesResult.data.examples);
      setSchemaCache(schemaResult.ok ? schemaResult.data : null);
      setLoading(false);
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const schemaTables = useMemo(
    () => Object.entries(schemaCache?.schema_json?.tables ?? {}),
    [schemaCache]
  );

  async function handleSaveSettings() {
    setSavingSettings(true);
    const result = await projectSqlService.upsertSettings(projectId, settings);
    if (result.ok) {
      setSettingsMeta(result.data);
      setSettings({
        is_enabled: result.data.is_enabled,
        shadow_mode: result.data.shadow_mode,
        provider: result.data.provider,
        model_name: result.data.model_name,
        temperature: result.data.temperature,
        max_context_tables: result.data.max_context_tables,
        max_examples: result.data.max_examples,
        auto_refresh_schema: result.data.auto_refresh_schema,
        schema_cache_ttl_seconds: result.data.schema_cache_ttl_seconds,
      });
    }
    setSavingSettings(false);
  }

  async function handleCreateAlias() {
    const result = await projectSqlService.createAlias(projectId, {
      ...aliasForm,
      alias: aliasForm.alias.trim(),
      target_name: aliasForm.target_name.trim(),
      table_name: aliasForm.table_name?.trim() || undefined,
      notes: aliasForm.notes?.trim() || undefined,
    });
    if (result.ok) {
      setAliases((prev) => [result.data, ...prev]);
      setAliasForm(DEFAULT_ALIAS);
    }
  }

  async function handleDeleteAlias(aliasId: string) {
    const result = await projectSqlService.deleteAlias(projectId, aliasId);
    if (result.ok) setAliases((prev) => prev.filter((item) => item.id !== aliasId));
  }

  async function handleCreateExample() {
    const result = await projectSqlService.createExample(projectId, {
      question: exampleForm.question.trim(),
      sql_query: exampleForm.sql_query.trim(),
      rationale: exampleForm.rationale?.trim() || undefined,
      tables_used: splitCsv(exampleForm.tables_used_raw),
      tags: splitCsv(exampleForm.tags_raw),
      is_active: exampleForm.is_active,
    });
    if (result.ok) {
      setExamples((prev) => [result.data, ...prev]);
      setExampleForm({ ...DEFAULT_EXAMPLE, tables_used_raw: "", tags_raw: "" });
    }
  }

  async function handleDeleteExample(exampleId: string) {
    const result = await projectSqlService.deleteExample(projectId, exampleId);
    if (result.ok) setExamples((prev) => prev.filter((item) => item.id !== exampleId));
  }

  async function handleFeedback(exampleId: string, success: boolean) {
    const result = await projectSqlService.recordExampleFeedback(projectId, exampleId, success);
    if (result.ok) {
      setExamples((prev) => prev.map((item) => (item.id === exampleId ? result.data : item)));
    }
  }

  async function handleRefreshSchema() {
    setRefreshingSchema(true);
    const result = await projectSqlService.refreshSchemaCache(projectId);
    if (result.ok) setSchemaCache(result.data);
    setRefreshingSchema(false);
  }

  async function handleDeleteSchemaCache() {
    const result = await projectSqlService.deleteSchemaCache(projectId);
    if (result.ok) setSchemaCache(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-primary" />
            <CardTitle>SQL Agent hybride</CardTitle>
          </div>
          <CardDescription>
            Pilote le runtime heuristique + Vanna par projet, avec garde-fous et cache de schéma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={settings.provider}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, provider: value as ProjectSqlProvider }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">hybrid</SelectItem>
                  <SelectItem value="heuristic">heuristic</SelectItem>
                  <SelectItem value="vanna">vanna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model name</Label>
              <Input
                value={settings.model_name ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, model_name: e.target.value || null }))}
                placeholder="Optionnel"
              />
            </div>

            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={settings.temperature ?? ""}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  temperature: e.target.value === "" ? null : Number(e.target.value),
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>TTL cache schéma (s)</Label>
              <Input
                type="number"
                min="30"
                value={settings.schema_cache_ttl_seconds}
                onChange={(e) => setSettings((prev) => ({ ...prev, schema_cache_ttl_seconds: Number(e.target.value) || 300 }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Max context tables</Label>
              <Input
                type="number"
                min="1"
                value={settings.max_context_tables}
                onChange={(e) => setSettings((prev) => ({ ...prev, max_context_tables: Number(e.target.value) || 12 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max examples</Label>
              <Input
                type="number"
                min="1"
                value={settings.max_examples}
                onChange={(e) => setSettings((prev) => ({ ...prev, max_examples: Number(e.target.value) || 20 }))}
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, is_enabled: checked }))}
                />
                <span className="text-sm">Actif</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  checked={settings.shadow_mode}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, shadow_mode: checked }))}
                />
                <span className="text-sm">Shadow mode</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  checked={settings.auto_refresh_schema}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, auto_refresh_schema: checked }))}
                />
                <span className="text-sm">Auto refresh schema</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {settingsMeta && (
                <Badge variant="outline">
                  Maj {formatTimestamp(settingsMeta.updated_at ?? settingsMeta.created_at)}
                </Badge>
              )}
              <Badge variant="secondary">Provider {settings.provider}</Badge>
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
              {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <CardTitle>Alias métier</CardTitle>
            </div>
            <CardDescription>Mappe le vocabulaire projet vers les vraies tables, colonnes ou valeurs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input value={aliasForm.alias} onChange={(e) => setAliasForm((prev) => ({ ...prev, alias: e.target.value }))} placeholder="packs" />
              </div>
              <div className="space-y-2">
                <Label>Type cible</Label>
                <Select value={aliasForm.target_type} onValueChange={(value) => setAliasForm((prev) => ({ ...prev, target_type: value as "table" | "column" | "value" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">table</SelectItem>
                    <SelectItem value="column">column</SelectItem>
                    <SelectItem value="value">value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nom cible</Label>
                <Input value={aliasForm.target_name} onChange={(e) => setAliasForm((prev) => ({ ...prev, target_name: e.target.value }))} placeholder="packs" />
              </div>
              <div className="space-y-2">
                <Label>Table associée</Label>
                <Input value={aliasForm.table_name ?? ""} onChange={(e) => setAliasForm((prev) => ({ ...prev, table_name: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={aliasForm.notes ?? ""} onChange={(e) => setAliasForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Contexte métier ou précision de mapping" />
            </div>
            <Button onClick={handleCreateAlias}>Ajouter l&apos;alias</Button>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aliases.map((alias) => (
                  <TableRow key={alias.id}>
                    <TableCell className="font-medium">{alias.alias}</TableCell>
                    <TableCell><Badge variant="outline">{alias.target_type}</Badge></TableCell>
                    <TableCell>{alias.target_name}</TableCell>
                    <TableCell>{alias.table_name ?? "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAlias(alias.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle>Exemples SQL</CardTitle>
            </div>
            <CardDescription>Exemples NL → SQL propres au projet, utilisés par le runtime hybride.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input value={exampleForm.question} onChange={(e) => setExampleForm((prev) => ({ ...prev, question: e.target.value }))} placeholder="liste les packs" />
            </div>
            <div className="space-y-2">
              <Label>SQL</Label>
              <Textarea value={exampleForm.sql_query} onChange={(e) => setExampleForm((prev) => ({ ...prev, sql_query: e.target.value }))} rows={5} placeholder="SELECT id, name FROM packs LIMIT 10" className="font-mono text-xs" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tables utilisées</Label>
                <Input value={exampleForm.tables_used_raw} onChange={(e) => setExampleForm((prev) => ({ ...prev, tables_used_raw: e.target.value }))} placeholder="packs, orders" />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input value={exampleForm.tags_raw} onChange={(e) => setExampleForm((prev) => ({ ...prev, tags_raw: e.target.value }))} placeholder="listing, pricing" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rationale</Label>
              <Textarea value={exampleForm.rationale ?? ""} onChange={(e) => setExampleForm((prev) => ({ ...prev, rationale: e.target.value }))} rows={3} placeholder="Pourquoi cette SQL est la bonne pour ce projet" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={exampleForm.is_active} onCheckedChange={(checked) => setExampleForm((prev) => ({ ...prev, is_active: checked }))} />
              <span className="text-sm">Exemple actif</span>
            </div>
            <Button onClick={handleCreateExample}>Ajouter l&apos;exemple</Button>

            <div className="space-y-3">
              {examples.map((example) => (
                <div key={example.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{example.question}</p>
                      <pre className="overflow-x-auto rounded bg-muted p-2 text-xs"><code>{example.sql_query}</code></pre>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {example.tables_used.map((table) => <Badge key={table} variant="outline">{table}</Badge>)}
                        {example.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        <Badge variant="outline">ok {example.success_count}</Badge>
                        <Badge variant="outline">ko {example.failure_count}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleFeedback(example.id, true)}>+OK</Button>
                      <Button variant="outline" size="sm" onClick={() => handleFeedback(example.id, false)}>+KO</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteExample(example.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <CardTitle>Cache de schéma</CardTitle>
          </div>
          <CardDescription>Vue rapide du schéma projet utilisé par le planner SQL hybride.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">TTL {schemaCache?.ttl_seconds ?? settings.schema_cache_ttl_seconds}s</Badge>
              <Badge variant="secondary">Tables {schemaTables.length}</Badge>
              {schemaCache?.schema_hash && <Badge variant="outline">Hash {schemaCache.schema_hash.slice(0, 12)}</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDeleteSchemaCache} disabled={!schemaCache}>
                <Trash2 className="mr-2 size-4" />Vider
              </Button>
              <Button onClick={handleRefreshSchema} disabled={refreshingSchema}>
                {refreshingSchema ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                Rafraîchir
              </Button>
            </div>
          </div>

          {schemaCache?.schema_json?.meta && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div>Mode: {String(schemaCache.schema_json.meta.connection_mode ?? "-")}</div>
              <div>DB type: {String(schemaCache.schema_json.meta.db_type ?? "-")}</div>
              <div>DB name: {String(schemaCache.schema_json.meta.db_name ?? "-")}</div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Colonnes safe</TableHead>
                <TableHead>Total colonnes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemaTables.map(([tableName, meta]) => (
                <TableRow key={tableName}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Table2 className="size-4 text-muted-foreground" />
                      {tableName}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(meta.safe ?? []).slice(0, 6).join(", ") || "-"}</TableCell>
                  <TableCell>{meta.all?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
