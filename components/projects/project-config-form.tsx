"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Building2,
  ChevronDown,
  Cpu,
  Globe,
  Info,
  KeyRound,
  Link2,
  MoreHorizontal,
  Plus,
  Save,
  TestTube2,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectLLMService } from "@/services/project-llm.service";
import { projectsService } from "@/services/projects.service";
import type {
  Project,
  ProjectLLMProvider,
  ProjectLLMProviderType,
  ProjectLLMUsage,
  ProjectSiteAction,
  UpsertProjectLLMProviderPayload,
} from "@/types";

interface Props {
  project: Project;
  onSaved: (updated: Project) => void;
}

type EditableProvider = ProjectLLMProvider & {
  api_key?: string;
  clear_api_key?: boolean;
};

const USAGE_ORDER: ProjectLLMUsage[] = [
  "final_response",
  "fast_agents",
  "vanna_sql",
  "semantic_critic",
];

const USAGE_LABELS: Record<ProjectLLMUsage, { title: string; desc: string }> = {
  final_response: {
    title: "Réponse finale",
    desc: "Génération du message assistant envoyé à l'utilisateur.",
  },
  fast_agents: {
    title: "Agents internes rapides",
    desc: "Routing, analyse d'intention, mapping schema et petits planners.",
  },
  vanna_sql: {
    title: "Vanna text-to-SQL",
    desc: "LLM utilisé pour transformer une question en SQL.",
  },
  semantic_critic: {
    title: "Critic sémantique",
    desc: "Vérification indépendante conditionnelle des synthèses multi-sources.",
  },
};

const PROVIDER_LABELS: Record<ProjectLLMProviderType, string> = {
  openai_compatible: "OpenAI-compatible",
  gemini: "Gemini",
  ollama: "Ollama local",
};

const GROQ_URL = "https://api.groq.com/openai/v1";

function createProvider(
  usage: ProjectLLMUsage,
  priority: number,
  preset: "groq" | "gemini" | "ollama" = "groq"
): EditableProvider {
  if (preset === "gemini") {
    return {
      id: null,
      usage,
      priority,
      enabled: true,
      provider_type: "gemini",
      name: "Gemini",
      url: null,
      model: "gemini-2.5-flash",
      has_api_key: false,
      temperature: usage === "fast_agents" ? 0 : 0.3,
      max_tokens: usage === "fast_agents" ? 200 : 1200,
      timeout_seconds: 30,
      max_concurrency: 4,
      max_project_concurrency: 2,
      queue_timeout_ms: 1000,
      input_cost_per_million_usd: null,
      output_cost_per_million_usd: null,
      api_key: "",
    };
  }
  if (preset === "ollama") {
    return {
      id: null,
      usage,
      priority,
      enabled: true,
      provider_type: "ollama",
      name: "Ollama local",
      url: null,
      model: "llama3.2:3b",
      has_api_key: false,
      temperature: usage === "fast_agents" ? 0 : 0.3,
      max_tokens: null,
      timeout_seconds: 60,
      max_concurrency: null,
      max_project_concurrency: null,
      queue_timeout_ms: null,
      input_cost_per_million_usd: null,
      output_cost_per_million_usd: null,
    };
  }
  return {
    id: null,
    usage,
    priority,
    enabled: true,
    provider_type: "openai_compatible",
    name: usage === "final_response" ? "Groq GPT-OSS 120B" : "Groq GPT-OSS 20B",
    url: GROQ_URL,
    model: usage === "final_response" ? "openai/gpt-oss-120b" : "openai/gpt-oss-20b",
    has_api_key: false,
    temperature: usage === "fast_agents" ? 0 : 0.2,
    max_tokens: usage === "fast_agents" ? 200 : 1200,
    timeout_seconds: usage === "fast_agents" ? 15 : 30,
    max_concurrency: 4,
    max_project_concurrency: 2,
    queue_timeout_ms: 1000,
    input_cost_per_million_usd: null,
    output_cost_per_million_usd: null,
    api_key: "",
  };
}

function toEditable(provider: ProjectLLMProvider): EditableProvider {
  return { ...provider, api_key: "", clear_api_key: false };
}

function toPayload(provider: EditableProvider): UpsertProjectLLMProviderPayload {
  const apiKey = provider.api_key?.trim();
  return {
    id: provider.id,
    usage: provider.usage,
    priority: provider.priority,
    enabled: provider.enabled,
    provider_type: provider.provider_type,
    name: provider.name.trim() || PROVIDER_LABELS[provider.provider_type],
    url: provider.url?.trim() || null,
    model: provider.model.trim(),
    api_key: apiKey ? apiKey : undefined,
    clear_api_key: provider.clear_api_key || false,
    temperature: provider.temperature,
    max_tokens: provider.max_tokens,
    timeout_seconds: provider.timeout_seconds || 30,
    max_concurrency: provider.max_concurrency,
    max_project_concurrency: provider.max_project_concurrency,
    queue_timeout_ms: provider.queue_timeout_ms,
    input_cost_per_million_usd: provider.input_cost_per_million_usd,
    output_cost_per_million_usd: provider.output_cost_per_million_usd,
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | null | undefined): string {
  return (value ?? []).join(", ");
}

function createSiteAction(): ProjectSiteAction {
  return {
    label: "",
    url: "",
    description: "",
    action_type: "view_page",
    tags: [],
    module_ids: [],
    priority: 50,
    enabled: true,
  };
}

function normalizeSiteActions(actions: ProjectSiteAction[] | null | undefined): ProjectSiteAction[] {
  return (actions ?? []).map((action) => ({
    label: action.label ?? "",
    url: action.url ?? "",
    description: action.description ?? "",
    action_type: action.action_type ?? "view_page",
    tags: action.tags ?? [],
    module_ids: action.module_ids ?? [],
    priority: action.priority ?? 50,
    enabled: action.enabled ?? true,
  }));
}

function toSiteActionPayload(action: ProjectSiteAction): ProjectSiteAction | null {
  const label = action.label.trim();
  const url = action.url.trim();
  if (!label || !url) return null;
  return {
    label,
    url,
    description: action.description?.trim() || null,
    action_type: action.action_type?.trim() || "view_page",
    tags: action.tags,
    module_ids: action.module_ids,
    priority: Math.max(0, Math.min(100, Number(action.priority) || 50)),
    enabled: action.enabled,
  };
}

export function ProjectConfigForm({ project, onSaved }: Props) {
  const cfg = project.config;

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [assistantName, setAssistantName] = useState(cfg?.assistant_name ?? "");
  const [companyName, setCompanyName] = useState(cfg?.company_name ?? "");
  const [assistantRole, setAssistantRole] = useState(cfg?.assistant_role ?? "");
  const [assistantTone, setAssistantTone] = useState(cfg?.assistant_tone ?? "");
  const [maxCtx, setMaxCtx] = useState(String(cfg?.max_context_messages ?? 10));
  const [contactWebsite, setContactWebsite] = useState(cfg?.contact_website ?? "");
  const [siteActions, setSiteActions] = useState<ProjectSiteAction[]>(
    normalizeSiteActions(cfg?.site_actions)
  );
  const [saving, setSaving] = useState(false);

  const [llmProviders, setLlmProviders] = useState<EditableProvider[]>([]);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmSaving, setLlmSaving] = useState(false);
  const [usesProjectLLM, setUsesProjectLLM] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadLLMSettings() {
      setLlmLoading(true);
      const result = await projectLLMService.getSettings(project.id);
      if (!cancelled && result.ok) {
        setUsesProjectLLM(result.data.uses_project_settings);
        setLlmProviders(result.data.providers.map(toEditable));
      }
      if (!cancelled) setLlmLoading(false);
    }
    loadLLMSettings();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const providersByUsage = useMemo(() => {
    const grouped: Record<ProjectLLMUsage, EditableProvider[]> = {
      final_response: [],
      fast_agents: [],
      vanna_sql: [],
      semantic_critic: [],
    };
    for (const provider of llmProviders) grouped[provider.usage].push(provider);
    for (const usage of USAGE_ORDER) {
      grouped[usage].sort((a, b) => a.priority - b.priority);
    }
    return grouped;
  }, [llmProviders]);

  const finalProviderSummary = providersByUsage.final_response
    .filter((provider) => provider.enabled)
    .map((provider) => provider.name || provider.model)
    .join(" → ") || "Fallback serveur";

  const updateSiteAction = (index: number, updates: Partial<ProjectSiteAction>) => {
    setSiteActions((prev) =>
      prev.map((action, currentIndex) =>
        currentIndex === index ? { ...action, ...updates } : action
      )
    );
  };

  const removeSiteAction = (index: number) => {
    setSiteActions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

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
      contact_website: contactWebsite.trim() || undefined,
      site_actions: siteActions
        .map(toSiteActionPayload)
        .filter((action): action is ProjectSiteAction => Boolean(action)),
    });
    if (result.ok) onSaved(result.data);
    setSaving(false);
  };

  const renumberUsage = (providers: EditableProvider[], usage: ProjectLLMUsage) => {
    let priority = 1;
    return providers.map((provider) =>
      provider.usage === usage ? { ...provider, priority: priority++ } : provider
    );
  };

  const updateProvider = (
    target: EditableProvider,
    updates: Partial<EditableProvider>
  ) => {
    setLlmProviders((prev) =>
      prev.map((provider) => (provider === target ? { ...provider, ...updates } : provider))
    );
  };

  const addProvider = (usage: ProjectLLMUsage, preset: "groq" | "gemini" | "ollama") => {
    const nextPriority = providersByUsage[usage].length + 1;
    const provider = createProvider(usage, nextPriority, preset);
    setLlmProviders((prev) => [...prev, provider]);
    setExpandedProviders((prev) => ({ ...prev, [`${usage}-${nextPriority}`]: true }));
  };

  const removeProvider = (target: EditableProvider) => {
    setLlmProviders((prev) =>
      renumberUsage(
        prev.filter((provider) => provider !== target),
        target.usage
      )
    );
  };

  const moveProvider = (target: EditableProvider, direction: -1 | 1) => {
    const usageProviders = providersByUsage[target.usage];
    const index = usageProviders.indexOf(target);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= usageProviders.length) return;
    const reordered = [...usageProviders];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const rest = llmProviders.filter((provider) => provider.usage !== target.usage);
    setLlmProviders([
      ...rest,
      ...reordered.map((provider, priority) => ({ ...provider, priority: priority + 1 })),
    ]);
  };

  const saveLLMSettings = async () => {
    setLlmSaving(true);
    const result = await projectLLMService.updateSettings(project.id, {
      providers: llmProviders.map(toPayload),
    });
    if (result.ok) {
      setUsesProjectLLM(true);
      setLlmProviders(result.data.providers.map(toEditable));
      setTestStatus({});
    }
    setLlmSaving(false);
  };

  const testProvider = async (provider: EditableProvider) => {
    const key = provider.id ?? `${provider.usage}-${provider.priority}`;
    setTestingProvider(key);
    const result = await projectLLMService.testProvider(project.id, toPayload(provider));
    setTestStatus((prev) => ({
      ...prev,
      [key]: result.ok
        ? `OK via ${result.data.provider}: ${result.data.response}`
        : "Échec du test provider",
    }));
    setTestingProvider(null);
  };

  return (
    <div className="config-form space-y-5">
      <Card className="config-section-card">
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

      <Card className="config-section-card">
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

      <Card className="config-section-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            <Link2 className="size-4" />Pages & actions
            <Badge variant="outline" className="ml-auto">
              {siteActions.filter((action) => action.enabled && action.label && action.url).length} active(s)
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Déclare les pages du site que l&apos;assistant peut proposer comme actions exploitables dans ses réponses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">URL du site</Label>
            <Input value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} className="h-8 text-sm" placeholder="https://client.example" />
            <p className="text-[11px] text-muted-foreground">
              Les URLs relatives comme <code>/packs</code> seront rattachées à cette URL côté backend.
            </p>
          </div>

          {siteActions.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Aucune page/action configurée. Ajoute les pages clés du site pour guider les utilisateurs.
            </div>
          ) : (
            <div className="space-y-2">
              {siteActions.map((action, index) => (
                <div key={index} className="rounded-md border bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch checked={action.enabled} onCheckedChange={(checked) => updateSiteAction(index, { enabled: checked })} />
                    <span className="text-xs text-muted-foreground">{action.enabled ? "Action active" : "Action désactivée"}</span>
                    <Button type="button" variant="outline" size="icon" className="ml-auto size-7 text-destructive" onClick={() => removeSiteAction(index)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Libellé</Label>
                      <Input value={action.label} onChange={(e) => updateSiteAction(index, { label: e.target.value })} className="h-8 text-xs" placeholder="Voir les packs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL</Label>
                      <Input value={action.url} onChange={(e) => updateSiteAction(index, { url: e.target.value })} className="h-8 text-xs" placeholder="/packs" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input value={action.description ?? ""} onChange={(e) => updateSiteAction(index, { description: e.target.value })} className="h-8 text-xs" placeholder="Comparer les offres disponibles" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <Select value={action.action_type ?? "view_page"} onValueChange={(value) => updateSiteAction(index, { action_type: value })}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view_page">Voir une page</SelectItem>
                          <SelectItem value="start_checkout">Continuer / checkout</SelectItem>
                          <SelectItem value="contact">Prendre contact</SelectItem>
                          <SelectItem value="book">Réserver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priorité</Label>
                      <Input type="number" min={0} max={100} value={action.priority} onChange={(e) => updateSiteAction(index, { priority: Number(e.target.value) || 50 })} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tags</Label>
                      <Input value={joinList(action.tags)} onChange={(e) => updateSiteAction(index, { tags: splitList(e.target.value) })} className="h-8 text-xs" placeholder="packs, prix, offres" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Modules liés</Label>
                      <Input value={joinList(action.module_ids)} onChange={(e) => updateSiteAction(index, { module_ids: splitList(e.target.value) })} className="h-8 text-xs" placeholder="creation_site, paiement_en_ligne" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setSiteActions((prev) => [...prev, createSiteAction()])}>
            <Plus className="size-3" />Ajouter une page/action
          </Button>
        </CardContent>
      </Card>

      <Card className="config-section-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            <Cpu className="size-4" />Configuration LLM
            <Badge variant={usesProjectLLM ? "default" : "outline"} className="ml-auto">
              {usesProjectLLM ? "Projet" : "Fallback .env"}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Configure les providers par usage. L&apos;ordre définit le fallback: provider 1, puis 2, puis 3.
            Les presets Groq utilisent des modèles `openai/gpt-oss-*`, modifiables à tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {llmLoading ? (
            <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
              Chargement de la configuration LLM…
            </div>
          ) : (
            USAGE_ORDER.map((usage) => (
              <div key={usage} className="config-usage-group rounded-xl border p-3 space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{USAGE_LABELS[usage].title}</div>
                    <p className="text-xs text-muted-foreground">{USAGE_LABELS[usage].desc}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="ml-auto h-8 gap-1.5 text-xs">
                        <Plus className="size-3.5" />Ajouter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ajouter un provider</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => addProvider(usage, "groq")}><Plus className="mr-2 size-3.5" />Groq</DropdownMenuItem>
                      {usage !== "vanna_sql" && <DropdownMenuItem onSelect={() => addProvider(usage, "gemini")}><Plus className="mr-2 size-3.5" />Gemini</DropdownMenuItem>}
                      <DropdownMenuItem onSelect={() => addProvider(usage, "ollama")}><Plus className="mr-2 size-3.5" />Ollama</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {providersByUsage[usage].length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    Aucun provider projet. Le backend utilisera le fallback `.env`.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providersByUsage[usage].map((provider, index) => {
                      const providerKey = provider.id ?? `${provider.usage}-${provider.priority}`;
                      const isExpanded = expandedProviders[providerKey] ?? false;
                      return (
                        <div key={providerKey} className="config-provider rounded-xl border bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="config-provider__summary flex min-w-0 flex-1 items-center gap-2 text-left"
                              onClick={() => setExpandedProviders((prev) => ({ ...prev, [providerKey]: !isExpanded }))}
                              aria-expanded={isExpanded}
                            >
                              <Badge variant="outline" className="shrink-0">#{index + 1}</Badge>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{provider.name || PROVIDER_LABELS[provider.provider_type]}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{PROVIDER_LABELS[provider.provider_type]} · {provider.model}</span>
                              </span>
                              <ChevronDown className={`ml-auto size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            <Switch checked={provider.enabled} onCheckedChange={(checked) => updateProvider(provider, { enabled: checked })} aria-label={provider.enabled ? "Désactiver le provider" : "Activer le provider"} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions pour ${provider.name || provider.model}`}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions provider</DropdownMenuLabel>
                                <DropdownMenuItem disabled={index === 0} onSelect={() => moveProvider(provider, -1)}><ArrowUp className="mr-2 size-3.5" />Monter la priorité</DropdownMenuItem>
                                <DropdownMenuItem disabled={index === providersByUsage[usage].length - 1} onSelect={() => moveProvider(provider, 1)}><ArrowDown className="mr-2 size-3.5" />Descendre la priorité</DropdownMenuItem>
                                <DropdownMenuItem disabled={testingProvider === providerKey} onSelect={() => testProvider(provider)}><TestTube2 className="mr-2 size-3.5" />{testingProvider === providerKey ? "Test en cours…" : "Tester le provider"}</DropdownMenuItem>
                                {provider.has_api_key && provider.provider_type !== "ollama" && (
                                  <DropdownMenuItem onSelect={() => updateProvider(provider, { clear_api_key: true, api_key: "" })}><KeyRound className="mr-2 size-3.5" />Supprimer la clé enregistrée</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => removeProvider(provider)}><Trash2 className="mr-2 size-3.5" />Supprimer le provider</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {provider.has_api_key && !provider.clear_api_key && (
                            <Badge variant="secondary" className="ml-9 mt-2 gap-1 text-[10px]"><KeyRound className="size-3" />Clé enregistrée</Badge>
                          )}
                          {testStatus[providerKey] && <p className="ml-9 mt-2 text-xs text-muted-foreground">{testStatus[providerKey]}</p>}

                          {isExpanded && <div className="config-provider__details mt-3 grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Nom</Label>
                              <Input value={provider.name} onChange={(e) => updateProvider(provider, { name: e.target.value })} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Type</Label>
                              <Select value={provider.provider_type} onValueChange={(value) => updateProvider(provider, { provider_type: value as ProjectLLMProviderType })}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai_compatible">OpenAI-compatible</SelectItem>
                                  {usage !== "vanna_sql" && <SelectItem value="gemini">Gemini</SelectItem>}
                                  <SelectItem value="ollama">Ollama</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Modèle</Label>
                              <Input value={provider.model} onChange={(e) => updateProvider(provider, { model: e.target.value })} className="h-8 text-xs" placeholder="openai/gpt-oss-20b" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Timeout sec.</Label>
                              <Input type="number" min={1} max={300} value={provider.timeout_seconds} onChange={(e) => updateProvider(provider, { timeout_seconds: Number(e.target.value) || 30 })} className="h-8 text-xs" />
                            </div>
                            {provider.provider_type === "openai_compatible" && (
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs">Endpoint</Label>
                                <Input value={provider.url ?? ""} onChange={(e) => updateProvider(provider, { url: e.target.value })} className="h-8 text-xs" placeholder={GROQ_URL} />
                              </div>
                            )}
                            {provider.provider_type !== "ollama" && (
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs">Clé API</Label>
                                <Input type="password" value={provider.api_key ?? ""} onChange={(e) => updateProvider(provider, { api_key: e.target.value, clear_api_key: false })} className="h-8 text-xs" placeholder={provider.has_api_key ? "Laisser vide pour conserver" : "gsk_... / clé provider"} />
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Température</Label>
                              <Input type="number" min={0} max={2} step={0.1} value={provider.temperature ?? ""} onChange={(e) => updateProvider(provider, { temperature: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="0" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Max tokens</Label>
                              <Input type="number" min={1} value={provider.max_tokens ?? ""} onChange={(e) => updateProvider(provider, { max_tokens: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="Auto" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Concurrence provider</Label>
                              <Input type="number" min={1} max={100} value={provider.max_concurrency ?? ""} onChange={(e) => updateProvider(provider, { max_concurrency: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="4" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Concurrence projet</Label>
                              <Input type="number" min={1} max={100} value={provider.max_project_concurrency ?? ""} onChange={(e) => updateProvider(provider, { max_project_concurrency: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="2" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Attente file (ms)</Label>
                              <Input type="number" min={0} max={30000} value={provider.queue_timeout_ms ?? ""} onChange={(e) => updateProvider(provider, { queue_timeout_ms: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="1000" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">USD / M tokens entrée</Label>
                              <Input type="number" min={0} step={0.000001} value={provider.input_cost_per_million_usd ?? ""} onChange={(e) => updateProvider(provider, { input_cost_per_million_usd: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="0" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">USD / M tokens sortie</Label>
                              <Input type="number" min={0} step={0.000001} value={provider.output_cost_per_million_usd ?? ""} onChange={(e) => updateProvider(provider, { output_cost_per_million_usd: e.target.value === "" ? null : Number(e.target.value) })} className="h-8 text-xs" placeholder="0" />
                            </div>
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={saveLLMSettings} disabled={llmSaving || llmLoading} className="gap-2">
              <Save className="size-4" />
              {llmSaving ? "Enregistrement LLM…" : "Enregistrer la configuration LLM"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="config-section-card border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="size-4" />Sources de connaissance
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Info className="size-3" />Routage automatique
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
              { label: "Recherche web", active: cfg?.enable_web_search ?? true, desc: "Fallback si RAG sans résultat" },
              { label: "Génération LLM", active: true, desc: finalProviderSummary },
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

      <div className="config-save-bar flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? "Enregistrement…" : "Enregistrer le projet"}
        </Button>
      </div>
    </div>
  );
}
