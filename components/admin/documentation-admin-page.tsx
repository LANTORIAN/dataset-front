"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, RefreshCw, Save, Plus, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { documentationContentService } from "@/services/documentation-content.service";
import { normalizeDocumentationContent } from "@/lib/documentation/default-content";
import { useAuth } from "@/lib/context/auth-context";
import type { DocumentationContent } from "@/types";

interface DocumentationAdminPageProps {
  initialContent: DocumentationContent;
}

const linesToText = (lines: string[]) => lines.join("\n");
const textToLines = (text: string) => text.split("\n").map((v) => v.trim()).filter(Boolean);

export function DocumentationAdminPage({ initialContent }: DocumentationAdminPageProps) {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<DocumentationContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const addOverviewModule = () => {
    setContent((prev) => ({
      ...prev,
      overview: {
        ...prev.overview,
        modules: [...prev.overview.modules, { title: "Nouveau module", points: ["Point 1"] }],
      },
    }));
  };

  const addDevCard = () => {
    setContent((prev) => ({
      ...prev,
      dev: {
        ...prev.dev,
        cards: [...prev.dev.cards, { title: "Nouvelle carte", description: "Description" }],
      },
    }));
  };

  const addQaArea = () => {
    setContent((prev) => ({
      ...prev,
      qa: {
        ...prev.qa,
        area_checks: [...prev.qa.area_checks, { area: "Nouvelle zone", checks: "Checklist" }],
      },
    }));
  };

  const reloadFromBackend = async () => {
    setLoading(true);
    const res = await documentationContentService.getAdmin();
    if (res.ok) setContent(normalizeDocumentationContent(res.data));
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const res = await documentationContentService.update(content);
    if (res.ok) setContent(normalizeDocumentationContent(res.data));
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acces refuse</CardTitle>
          <CardDescription>Seuls les super admins peuvent modifier la documentation publique.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contenu documentation</h2>
          <p className="text-sm text-muted-foreground">Edition dynamique du contenu public de la page /documentation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/documentation" target="_blank">
              Voir la page publique
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={reloadFromBackend} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Recharger
          </Button>
          <Button size="sm" className="gap-2" onClick={save} disabled={saving}>
            <Save className="size-3.5" />{saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero">
        <Card className="mb-4 border-info/40 bg-info/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contrat backend attendu</CardTitle>
            <CardDescription className="text-xs">
              Frontend: <code className="rounded bg-muted px-1">GET/PUT /api/documentation/content</code>. Backend relaye: <code className="rounded bg-muted px-1">/support/content/documentation</code> + <code className="rounded bg-muted px-1">/admin/support/content/documentation</code>.
            </CardDescription>
          </CardHeader>
        </Card>

        <TabsList>
          <TabsTrigger value="hero">Global</TabsTrigger>
          <TabsTrigger value="overview">Vue app</TabsTrigger>
          <TabsTrigger value="dev">Dev</TabsTrigger>
          <TabsTrigger value="qa">QA</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="size-4" />Hero public</CardTitle>
              <CardDescription>Titre et sous-titre affiches en haut de la documentation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Titre</Label>
                <Input value={content.hero.title} onChange={(e) => setContent((p) => ({ ...p, hero: { ...p.hero, title: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sous-titre</Label>
                <Textarea rows={4} value={content.hero.subtitle} onChange={(e) => setContent((p) => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Section globale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={content.overview.title} onChange={(e) => setContent((p) => ({ ...p, overview: { ...p.overview, title: e.target.value } }))} />
              <Textarea rows={4} value={content.overview.intro} onChange={(e) => setContent((p) => ({ ...p, overview: { ...p.overview, intro: e.target.value } }))} />
              <div className="space-y-3">
                {content.overview.modules.map((module, index) => (
                  <div key={`${module.title}-${index}`} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={module.title} onChange={(e) => setContent((prev) => ({ ...prev, overview: { ...prev.overview, modules: prev.overview.modules.map((m, i) => i === index ? { ...m, title: e.target.value } : m) } }))} />
                      <Button variant="ghost" size="icon" onClick={() => setContent((prev) => ({ ...prev, overview: { ...prev.overview, modules: prev.overview.modules.filter((_, i) => i !== index) } }))}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Textarea rows={4} value={linesToText(module.points)} onChange={(e) => setContent((prev) => ({ ...prev, overview: { ...prev.overview, modules: prev.overview.modules.map((m, i) => i === index ? { ...m, points: textToLines(e.target.value) } : m) } }))} />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-2" onClick={addOverviewModule}><Plus className="size-3.5" />Ajouter un module</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dev" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Section developpeurs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={content.dev.title} onChange={(e) => setContent((p) => ({ ...p, dev: { ...p.dev, title: e.target.value } }))} />
              <Textarea rows={4} value={content.dev.intro} onChange={(e) => setContent((p) => ({ ...p, dev: { ...p.dev, intro: e.target.value } }))} />
              <Label>Cartes architecture</Label>
              {content.dev.cards.map((card, index) => (
                <div key={`${card.title}-${index}`} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={card.title} onChange={(e) => setContent((prev) => ({ ...prev, dev: { ...prev.dev, cards: prev.dev.cards.map((c, i) => i === index ? { ...c, title: e.target.value } : c) } }))} />
                    <Button variant="ghost" size="icon" onClick={() => setContent((prev) => ({ ...prev, dev: { ...prev.dev, cards: prev.dev.cards.filter((_, i) => i !== index) } }))}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Textarea rows={3} value={card.description} onChange={(e) => setContent((prev) => ({ ...prev, dev: { ...prev.dev, cards: prev.dev.cards.map((c, i) => i === index ? { ...c, description: e.target.value } : c) } }))} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-2" onClick={addDevCard}><Plus className="size-3.5" />Ajouter une carte</Button>
              <Label>Etapes integration API (1 ligne = 1 etape)</Label>
              <Textarea rows={6} value={linesToText(content.dev.integration_steps)} onChange={(e) => setContent((p) => ({ ...p, dev: { ...p.dev, integration_steps: textToLines(e.target.value) } }))} />
              <Label>Exemple payload</Label>
              <Textarea rows={8} value={content.dev.payload_example} onChange={(e) => setContent((p) => ({ ...p, dev: { ...p.dev, payload_example: e.target.value } }))} className="font-mono text-xs" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Section QA</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={content.qa.title} onChange={(e) => setContent((p) => ({ ...p, qa: { ...p.qa, title: e.target.value } }))} />
              <Textarea rows={4} value={content.qa.intro} onChange={(e) => setContent((p) => ({ ...p, qa: { ...p.qa, intro: e.target.value } }))} />
              <Label>Strategie globale QA (1 ligne = 1 point)</Label>
              <Textarea rows={6} value={linesToText(content.qa.strategy)} onChange={(e) => setContent((p) => ({ ...p, qa: { ...p.qa, strategy: textToLines(e.target.value) } }))} />
              <Label>Checks par zone</Label>
              {content.qa.area_checks.map((area, index) => (
                <div key={`${area.area}-${index}`} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={area.area} onChange={(e) => setContent((prev) => ({ ...prev, qa: { ...prev.qa, area_checks: prev.qa.area_checks.map((a, i) => i === index ? { ...a, area: e.target.value } : a) } }))} />
                    <Button variant="ghost" size="icon" onClick={() => setContent((prev) => ({ ...prev, qa: { ...prev.qa, area_checks: prev.qa.area_checks.filter((_, i) => i !== index) } }))}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Textarea rows={3} value={area.checks} onChange={(e) => setContent((prev) => ({ ...prev, qa: { ...prev.qa, area_checks: prev.qa.area_checks.map((a, i) => i === index ? { ...a, checks: e.target.value } : a) } }))} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-2" onClick={addQaArea}><Plus className="size-3.5" />Ajouter une zone</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="size-3.5" />{saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
        </Button>
        <Button variant="ghost" onClick={() => setContent(initialContent)}>Revenir aux valeurs chargees</Button>
      </div>
    </div>
  );
}
