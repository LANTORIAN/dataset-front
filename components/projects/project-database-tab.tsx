"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Loader2,
  Save,
  ShieldCheck,
  TestTube2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { projectDatabaseService } from "@/services/project-database.service";
import type {
  ProjectDatabaseConfig,
  ProjectConnectionMode,
  ProjectDatabaseType,
  ProjectDatabaseSslMode,
  ProjectDatabaseTestResult,
  UpsertProjectDatabaseConfigPayload,
} from "@/types";

interface Props {
  projectId: string;
}

interface FormState {
  connection_mode: ProjectConnectionMode;
  db_type: "postgres" | "mysql";
  host: string;
  port: string;
  db_name: string;
  db_user: string;
  db_password: string;
  ssl_mode: ProjectDatabaseSslMode;
  agent_base_url: string;
  agent_token: string;
  ssh_host: string;
  ssh_port: string;
  ssh_user: string;
  ssh_auth_method: "password" | "private_key";
  ssh_password: string;
  ssh_private_key: string;
  ssh_private_key_passphrase: string;
  ssh_remote_host: string;
  ssh_remote_port: string;
  is_enabled: boolean;
  consent_share_data: boolean;
  consent_version: string;
  include_tables_raw: string;
  exclude_tables_raw: string;
  connect_timeout_seconds: string;
  statement_timeout_ms: string;
  max_rows: string;
}

const DEFAULT_FORM: FormState = {
  connection_mode: "direct",
  db_type: "postgres",
  host: "",
  port: "5432",
  db_name: "",
  db_user: "",
  db_password: "",
  ssl_mode: "require",
  agent_base_url: "",
  agent_token: "",
  ssh_host: "",
  ssh_port: "22",
  ssh_user: "",
  ssh_auth_method: "password",
  ssh_password: "",
  ssh_private_key: "",
  ssh_private_key_passphrase: "",
  ssh_remote_host: "127.0.0.1",
  ssh_remote_port: "3306",
  is_enabled: false,
  consent_share_data: false,
  consent_version: "v1",
  include_tables_raw: "",
  exclude_tables_raw: "",
  connect_timeout_seconds: "5",
  statement_timeout_ms: "8000",
  max_rows: "100",
};

function toForm(cfg: ProjectDatabaseConfig): FormState {
  return {
    connection_mode: cfg.connection_mode ?? "direct",
    db_type: cfg.db_type,
    host: cfg.host ?? "",
    port: String(cfg.port ?? 5432),
    db_name: cfg.db_name ?? "",
    db_user: cfg.db_user ?? "",
    db_password: "",
    ssl_mode: cfg.ssl_mode,
    agent_base_url: cfg.agent_base_url ?? "",
    agent_token: "",
    ssh_host: cfg.ssh_host ?? "",
    ssh_port: String(cfg.ssh_port ?? 22),
    ssh_user: cfg.ssh_user ?? "",
    ssh_auth_method: (cfg.ssh_auth_method as "password" | "private_key") ?? "password",
    ssh_password: "",
    ssh_private_key: "",
    ssh_private_key_passphrase: "",
    ssh_remote_host: cfg.ssh_remote_host ?? "127.0.0.1",
    ssh_remote_port: String(cfg.ssh_remote_port ?? (cfg.db_type === "mysql" ? 3306 : 5432)),
    is_enabled: cfg.is_enabled,
    consent_share_data: cfg.consent_share_data,
    consent_version: cfg.consent_version ?? "v1",
    include_tables_raw: (cfg.include_tables ?? []).join(", "),
    exclude_tables_raw: (cfg.exclude_tables ?? []).join(", "),
    connect_timeout_seconds: String(cfg.connect_timeout_seconds),
    statement_timeout_ms: String(cfg.statement_timeout_ms),
    max_rows: String(cfg.max_rows),
  };
}

function parseTableList(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.toLowerCase());
}

export function ProjectDatabaseTab({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existing, setExisting] = useState<ProjectDatabaseConfig | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [testResult, setTestResult] = useState<ProjectDatabaseTestResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSshAdvanced, setShowSshAdvanced] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await projectDatabaseService.get(projectId);
    if (result.ok) {
      setExisting(result.data);
      setForm(toForm(result.data));
    } else {
      setExisting(null);
      setForm(DEFAULT_FORM);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEnable = useMemo(
    () => !form.is_enabled || form.consent_share_data,
    [form.is_enabled, form.consent_share_data]
  );

  const payload: UpsertProjectDatabaseConfigPayload = {
    connection_mode: form.connection_mode,
    db_type: form.db_type,
    host: form.connection_mode === "direct" ? form.host.trim() : undefined,
    port: form.connection_mode === "direct" ? (parseInt(form.port, 10) || 5432) : undefined,
    db_name: form.connection_mode === "direct" ? form.db_name.trim() : undefined,
    db_user: form.connection_mode === "direct" ? form.db_user.trim() : undefined,
    db_password: form.connection_mode === "direct" ? (form.db_password.trim() || undefined) : undefined,
    ssl_mode: form.ssl_mode,
    agent_base_url: form.connection_mode === "local_agent" ? form.agent_base_url.trim() : undefined,
    agent_token: form.connection_mode === "local_agent" ? (form.agent_token.trim() || undefined) : undefined,
    ssh_host: form.connection_mode === "ssh_tunnel" ? form.ssh_host.trim() : undefined,
    ssh_port: form.connection_mode === "ssh_tunnel" ? (parseInt(form.ssh_port, 10) || 22) : undefined,
    ssh_user: form.connection_mode === "ssh_tunnel" ? form.ssh_user.trim() : undefined,
    ssh_auth_method: form.connection_mode === "ssh_tunnel" ? form.ssh_auth_method : undefined,
    ssh_password: form.connection_mode === "ssh_tunnel" && form.ssh_auth_method === "password" ? (form.ssh_password.trim() || undefined) : undefined,
    ssh_private_key: form.connection_mode === "ssh_tunnel" && form.ssh_auth_method === "private_key" ? (form.ssh_private_key.trim() || undefined) : undefined,
    ssh_private_key_passphrase: form.connection_mode === "ssh_tunnel" && form.ssh_auth_method === "private_key" ? (form.ssh_private_key_passphrase.trim() || undefined) : undefined,
    ssh_remote_host: form.connection_mode === "ssh_tunnel" ? (form.ssh_remote_host.trim() || "127.0.0.1") : undefined,
    ssh_remote_port: form.connection_mode === "ssh_tunnel" ? (parseInt(form.ssh_remote_port, 10) || (form.db_type === "mysql" ? 3306 : 5432)) : undefined,
    is_enabled: form.is_enabled,
    consent_share_data: form.consent_share_data,
    consent_version: form.consent_version.trim() || "v1",
    include_tables: parseTableList(form.include_tables_raw),
    exclude_tables: parseTableList(form.exclude_tables_raw),
    connect_timeout_seconds: parseInt(form.connect_timeout_seconds, 10) || 5,
    statement_timeout_ms: parseInt(form.statement_timeout_ms, 10) || 8000,
    max_rows: parseInt(form.max_rows, 10) || 100,
  };

  const handleSave = async () => {
    setFormError(null);

    if (payload.connection_mode === "direct") {
      if (!payload.host || !payload.db_name || !payload.db_user) {
        setFormError("Host, nom de base et utilisateur sont obligatoires en mode direct.");
        return;
      }
      if (!existing?.has_password && !payload.db_password) {
        setFormError("Le mot de passe DB est obligatoire pour la premiere configuration directe.");
        return;
      }
    } else if (payload.connection_mode === "local_agent") {
      if (!payload.agent_base_url) {
        setFormError("L'URL de l'agent local est obligatoire en mode local-agent.");
        return;
      }
      if (!existing?.has_agent_token && !payload.agent_token) {
        setFormError("Le token agent est obligatoire pour la premiere configuration local-agent.");
        return;
      }
    } else {
      if (!payload.ssh_host || !payload.ssh_user) {
        setFormError("SSH host et user sont obligatoires en mode SSH tunnel.");
        return;
      }
      if (!payload.db_name || !payload.db_user) {
        setFormError("DB name et DB user sont obligatoires en mode SSH tunnel.");
        return;
      }
      if (!existing?.has_password && !payload.db_password) {
        setFormError("Le mot de passe DB est obligatoire pour la premiere configuration SSH.");
        return;
      }
      if (form.ssh_auth_method === "password") {
        if (!existing?.has_ssh_password && !payload.ssh_password) {
          setFormError("Le mot de passe SSH est obligatoire pour la premiere configuration SSH.");
          return;
        }
      } else if (!existing?.has_ssh_private_key && !payload.ssh_private_key) {
        setFormError("La cle privee SSH est obligatoire pour la premiere configuration SSH.");
        return;
      }
    }

    if (!canEnable) {
      setFormError(
        "Vous devez accepter le partage de donnees (RGPD) pour activer l'acces DB."
      );
      return;
    }

    setSaving(true);
    const result = await projectDatabaseService.upsert(projectId, payload);
    if (result.ok) {
      setExisting(result.data);
      setForm(toForm(result.data));
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await projectDatabaseService.test(projectId);
    if (result.ok) {
      setTestResult(result.data);
      await load();
    }
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!window.confirm("Supprimer la configuration DB externe de ce projet ?")) return;
    setDeleting(true);
    const result = await projectDatabaseService.remove(projectId);
    if (result.ok) {
      setExisting(null);
      setForm(DEFAULT_FORM);
      setTestResult(null);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-warning-surface-border bg-warning-surface/40">
        <CardContent className="pt-5">
          <p className="text-xs text-warning-surface-foreground flex items-start gap-2">
            <ShieldCheck className="size-4 mt-0.5 shrink-0" />
            Cette connexion permet a l&apos;IA de lire des donnees metier du client.
            Configurez un utilisateur base de donnees en lecture seule et activez le consentement RGPD.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="size-4" />Base de donnees externe du projet
          </CardTitle>
          <CardDescription className="text-xs">
            Configure la base metier interrogee par l&apos;assistant pour ce projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Mode de connexion</Label>
              <Select
                value={form.connection_mode}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, connection_mode: v as ProjectConnectionMode }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct DB</SelectItem>
                  <SelectItem value="local_agent">Local Agent</SelectItem>
                  <SelectItem value="ssh_tunnel">SSH Tunnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={form.db_type}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, db_type: v as ProjectDatabaseType }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.connection_mode === "direct" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Host</Label>
                  <Input
                    value={form.host}
                    onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="db.client.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input
                    value={form.port}
                    onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="5432"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nom de base</Label>
                  <Input
                    value={form.db_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, db_name: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="business_db"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Utilisateur DB</Label>
                  <Input
                    value={form.db_user}
                    onChange={(e) => setForm((prev) => ({ ...prev, db_user: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="readonly_user"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">SSL mode</Label>
                  <Select
                    value={form.ssl_mode}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, ssl_mode: v as ProjectDatabaseSslMode }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disable">disable</SelectItem>
                      <SelectItem value="allow">allow</SelectItem>
                      <SelectItem value="prefer">prefer</SelectItem>
                      <SelectItem value="require">require</SelectItem>
                      <SelectItem value="verify-ca">verify-ca</SelectItem>
                      <SelectItem value="verify-full">verify-full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs">
                    Mot de passe DB {existing?.has_password ? "(laisser vide pour conserver)" : "*"}
                  </Label>
                  <Input
                    type="password"
                    value={form.db_password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, db_password: e.target.value }))
                    }
                    className="h-8 text-sm"
                    placeholder={existing?.has_password ? "********" : "Mot de passe"}
                  />
                </div>
              </>
            ) : form.connection_mode === "local_agent" ? (
              <>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <Label className="text-xs flex items-center gap-1.5"><Server className="size-3.5" />URL Agent</Label>
                  <Input
                    value={form.agent_base_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, agent_base_url: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="https://agent-crm.bluevaloris.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs">
                    Token agent {existing?.has_agent_token ? "(laisser vide pour conserver)" : "*"}
                  </Label>
                  <Input
                    type="password"
                    value={form.agent_token}
                    onChange={(e) => setForm((prev) => ({ ...prev, agent_token: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder={existing?.has_agent_token ? "********" : "agt_xxx"}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Serveur SSH</Label>
                  <Input
                    value={form.ssh_host}
                    onChange={(e) => setForm((prev) => ({ ...prev, ssh_host: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="agent-crm.bluevaloris.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Port SSH</Label>
                  <Input
                    value={form.ssh_port}
                    onChange={(e) => setForm((prev) => ({ ...prev, ssh_port: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="22"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Utilisateur SSH</Label>
                  <Input
                    value={form.ssh_user}
                    onChange={(e) => setForm((prev) => ({ ...prev, ssh_user: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="ubuntu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Methode SSH</Label>
                  <Select
                    value={form.ssh_auth_method}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, ssh_auth_method: v as "password" | "private_key" }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password">Mot de passe</SelectItem>
                      <SelectItem value="private_key">Cle privee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom de base</Label>
                  <Input
                    value={form.db_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, db_name: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="crm_db"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Utilisateur DB</Label>
                  <Input
                    value={form.db_user}
                    onChange={(e) => setForm((prev) => ({ ...prev, db_user: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="readonly_user"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mot de passe DB {existing?.has_password ? "(laisser vide pour conserver)" : "*"}</Label>
                  <Input
                    type="password"
                    value={form.db_password}
                    onChange={(e) => setForm((prev) => ({ ...prev, db_password: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder={existing?.has_password ? "********" : "db password"}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3 rounded-md border p-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSshAdvanced((v) => !v)}
                  >
                    {showSshAdvanced ? "Masquer la base distante (avance)" : "Afficher la base distante via SSH (avance)"}
                  </button>
                </div>

                {showSshAdvanced && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hote base distante (via SSH)</Label>
                      <Input
                        value={form.ssh_remote_host}
                        onChange={(e) => setForm((prev) => ({ ...prev, ssh_remote_host: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="127.0.0.1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Port base distante (via SSH)</Label>
                      <Input
                        value={form.ssh_remote_port}
                        onChange={(e) => setForm((prev) => ({ ...prev, ssh_remote_port: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder={form.db_type === "mysql" ? "3306" : "5432"}
                      />
                    </div>
                  </>
                )}

                {form.ssh_auth_method === "password" ? (
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label className="text-xs">
                      Mot de passe SSH {existing?.has_ssh_password ? "(laisser vide pour conserver)" : "*"}
                    </Label>
                    <Input
                      type="password"
                      value={form.ssh_password}
                      onChange={(e) => setForm((prev) => ({ ...prev, ssh_password: e.target.value }))}
                      className="h-8 text-sm"
                      placeholder={existing?.has_ssh_password ? "********" : "ssh password"}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">
                        Cle privee SSH {existing?.has_ssh_private_key ? "(laisser vide pour conserver)" : "*"}
                      </Label>
                      <Textarea
                        value={form.ssh_private_key}
                        onChange={(e) => setForm((prev) => ({ ...prev, ssh_private_key: e.target.value }))}
                        className="min-h-24 text-xs"
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Passphrase cle privee (optionnel)</Label>
                      <Input
                        type="password"
                        value={form.ssh_private_key_passphrase}
                        onChange={(e) => setForm((prev) => ({ ...prev, ssh_private_key_passphrase: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="passphrase"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Connect timeout (s)</Label>
              <Input
                value={form.connect_timeout_seconds}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, connect_timeout_seconds: e.target.value }))
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Statement timeout (ms)</Label>
              <Input
                value={form.statement_timeout_ms}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, statement_timeout_ms: e.target.value }))
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max lignes</Label>
              <Input
                value={form.max_rows}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, max_rows: e.target.value }))
                }
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Include tables (optionnel)</Label>
              <Textarea
                value={form.include_tables_raw}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, include_tables_raw: e.target.value }))
                }
                className="min-h-20 text-xs"
                placeholder="clients, orders, invoices"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exclude tables (optionnel)</Label>
              <Textarea
                value={form.exclude_tables_raw}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, exclude_tables_raw: e.target.value }))
                }
                className="min-h-20 text-xs"
                placeholder="audit_logs, payments_raw"
              />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-start gap-3">
              <Switch
                checked={form.consent_share_data}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, consent_share_data: v }))
                }
                id="rgpd-consent"
              />
              <div>
                <Label htmlFor="rgpd-consent" className="text-xs font-medium cursor-pointer">
                  J&apos;accepte de partager les donnees de cette base avec l&apos;assistant IA
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Consentement requis (RGPD) avant toute activation. Vous restez responsable
                  de la base connectee et des droits accordes.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium">Activer l&apos;acces DB externe</Label>
                <p className="text-xs text-muted-foreground">
                  L&apos;assistant pourra lire les tables autorisees pour repondre.
                </p>
              </div>
              <Switch
                checked={form.is_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_enabled: v }))}
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {formError}
            </div>
          )}

          {!canEnable && (
            <div className="rounded-md border border-warning-surface-border bg-warning-surface/40 p-2 text-xs text-warning-surface-foreground flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              Activez d&apos;abord le consentement RGPD pour pouvoir activer l&apos;acces DB.
            </div>
          )}

          {existing && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Dernier test: {existing.last_tested_at ? new Date(existing.last_tested_at).toLocaleString() : "jamais"}
              </span>
              {existing.last_test_success != null && (
                <span className="inline-flex items-center gap-1">
                  {existing.last_test_success ? (
                    <CheckCircle2 className="size-3 text-success" />
                  ) : (
                    <XCircle className="size-3 text-destructive" />
                  )}
                  {existing.last_test_success ? "succes" : "echec"}
                </span>
              )}
            </div>
          )}

          {testResult && (
            <div className="rounded-md border border-success/30 bg-success/5 p-3 text-xs space-y-1">
              <p className="font-medium">Connexion OK</p>
              <p>Database: {testResult.database}</p>
              <p>User: {testResult.user}</p>
              <p>Tables detectees: {testResult.tables_preview.join(", ") || "aucune"}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {existing && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Supprimer
              </Button>
            )}

            <Button
              variant="secondary"
              className="gap-2"
              onClick={handleTest}
              disabled={testing || saving || !existing || !form.consent_share_data}
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
              Tester la connexion
            </Button>

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
