"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { projectsService } from "@/services/projects.service";
import type { ProjectSetupSummary } from "@/types";
import { Check, Copy, Database, Eye, KeyRound, Loader2, MessageSquare, RefreshCw, Search, Settings2 } from "lucide-react";

function buildCompose(project: ProjectSetupSummary, agentToken?: string) {
  return `services:\n  local-agent:\n    image: bluevaloris/local-agent:0.1.0\n    restart: unless-stopped\n    environment:\n      PROJECT_ID: "${project.id}"\n      AGENT_TOKEN: "${agentToken ?? "<REVEAL_AGENT_TOKEN>"}"\n      BACKEND_URL: "https://api-mind.bluevaloris.com"\n      DB_TYPE: "postgres"\n      DB_HOST: "${project.db_host ?? "postgres"}"\n      DB_PORT: "${project.db_port ?? 5432}"\n      DB_NAME: "${project.db_name ?? "your_database"}"\n      DB_USER: "readonly_user"\n      DB_PASSWORD: "<SECRET>"\n      DB_SSLMODE: "${project.db_ssl_mode ?? "require"}"`;
}

export function ProjectAccessPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<ProjectSetupSummary[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [agentTokens, setAgentTokens] = useState<Record<string, string>>({});
  const [busyProject, setBusyProject] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await projectsService.listSetupSummaries({ page: 1, limit: 200, search: search || undefined });
    if (res.ok) setProjects(res.data.projects);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const copy = async (id: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const revealApi = async (projectId: string) => {
    setBusyProject(projectId);
    const res = await projectsService.revealKey(projectId);
    if (res.ok) setApiKeys((prev) => ({ ...prev, [projectId]: res.data.api_key }));
    setBusyProject(null);
  };

  const revealAgent = async (projectId: string) => {
    setBusyProject(projectId);
    const res = await projectsService.revealAgentToken(projectId);
    if (res.ok) setAgentTokens((prev) => ({ ...prev, [projectId]: res.data.agent_token }));
    setBusyProject(null);
  };

  const revealAllSecrets = async (projectId: string) => {
    setBusyProject(projectId);
    const [apiRes, agentRes] = await Promise.all([
      projectsService.revealKey(projectId),
      projectsService.revealAgentToken(projectId),
    ]);
    if (apiRes.ok) {
      setApiKeys((prev) => ({ ...prev, [projectId]: apiRes.data.api_key }));
    }
    if (agentRes.ok) {
      setAgentTokens((prev) => ({ ...prev, [projectId]: agentRes.data.agent_token }));
    }
    setBusyProject(null);
  };

  const rotateAgent = async (projectId: string) => {
    setBusyProject(projectId);
    const res = await projectsService.rotateAgentToken(projectId);
    if (res.ok) setAgentTokens((prev) => ({ ...prev, [projectId]: res.data.agent_token }));
    await load();
    setBusyProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Acces projets et boilerplates</h2>
        <p className="text-sm text-muted-foreground">Retrouve les cles masquees, revele si besoin, et copie un boilerplate local-agent par projet.</p>
      </div>

      <Card className="mx-auto w-full max-w-4xl">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => {
            const apiKey = apiKeys[project.id];
            const agentToken = agentTokens[project.id];
            const compose = buildCompose(project, agentToken);
            return (
              <Card key={project.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <CardDescription>{project.slug}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={project.is_active ? "default" : "secondary"}>{project.is_active ? "actif" : "inactif"}</Badge>
                      <Badge variant="outline">API {project.api_key_masked}</Badge>
                      <Badge variant="outline">Agent {project.agent_token_masked ?? "non genere"}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs font-medium flex items-center gap-2"><Database className="size-3.5" />Configuration DB</p>
                      <p className="text-xs text-muted-foreground">{project.has_db_config ? (project.connection_mode === "local_agent" ? `agent: ${project.agent_base_url ?? "-"}` : `${project.db_type ?? "db"}://${project.db_host ?? "-"}:${project.db_port ?? "-"}/${project.db_name ?? "-"}`) : "Aucune configuration"}</p>
                      <div className="flex gap-2 text-xs">
                        <Badge variant={project.db_enabled ? "default" : "secondary"}>DB {project.db_enabled ? "activee" : "desactivee"}</Badge>
                        <Badge variant={project.db_consent ? "default" : "secondary"}>RGPD {project.db_consent ? "ok" : "non"}</Badge>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs font-medium flex items-center gap-2"><Settings2 className="size-3.5" />Actions rapides</p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="gap-2"><Link href={`/chat?project=${project.id}`}><MessageSquare className="size-3.5" />Conversation</Link></Button>
                        <Button asChild size="sm" variant="outline" className="gap-2"><Link href={`/projects/${project.id}`}><Database className="size-3.5" />Configurer DB</Link></Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs font-medium flex items-center gap-2"><KeyRound className="size-3.5" />API key</p>
                      <code className="block rounded border bg-muted px-2 py-1 text-[11px] break-all">{apiKey ?? project.api_key_masked}</code>
                      <Button size="sm" variant="secondary" className="gap-2" onClick={() => revealApi(project.id)} disabled={busyProject === project.id}>
                        {busyProject === project.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}Reveal key
                      </Button>
                    </div>

                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs font-medium flex items-center gap-2"><KeyRound className="size-3.5" />Agent token</p>
                      <code className="block rounded border bg-muted px-2 py-1 text-[11px] break-all">{agentToken ?? project.agent_token_masked ?? "Non disponible"}</code>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="gap-2" onClick={() => revealAgent(project.id)} disabled={busyProject === project.id}>
                          {busyProject === project.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}Reveal
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => rotateAgent(project.id)} disabled={busyProject === project.id}>
                          <RefreshCw className="size-3.5" />Rotate
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-warning-surface-border bg-warning-surface/35 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-warning-surface-foreground">
                        Action rapide: revele les deux cles de ce projet en une fois.
                        A utiliser seulement si necessaire, puis stocker en secret manager.
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => revealAllSecrets(project.id)}
                        disabled={busyProject === project.id}
                      >
                        {busyProject === project.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                        Reveal API + Agent
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium">Boilerplate local-agent</p>
                    <pre className="max-h-48 overflow-auto rounded border bg-muted px-3 py-2 text-[11px]">{compose}</pre>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => copy(`compose-${project.id}`, compose)}>
                        {copied === `compose-${project.id}` ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}Copier boilerplate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
