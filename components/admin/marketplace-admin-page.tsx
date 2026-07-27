"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { marketplaceService } from "@/services/marketplace.service";
import type { MarketplaceModule, MarketplaceModuleUpsert } from "@/types";

const EMPTY_FORM: MarketplaceModuleUpsert = {
  module_id: "",
  name: "",
  description: "",
  needs: [],
  required_data: [],
  preconditions: [],
  compatible_with: [],
  incompatible_with: [],
  priority: 50,
  output_type: "recommendation_card",
  is_enabled: true,
};

export function MarketplaceAdminPage() {
  const [modules, setModules] = useState<MarketplaceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketplaceModule | null>(null);
  const [form, setForm] = useState<MarketplaceModuleUpsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const result = await marketplaceService.listSystemModules();
    if (result.ok) setModules(result.data.modules);
    setLoading(false);
  };

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (mod: MarketplaceModule) => {
    setEditing(mod);
    setForm({
      module_id: mod.module_id,
      name: mod.name,
      description: mod.description,
      needs: mod.needs,
      required_data: mod.required_data,
      preconditions: mod.preconditions,
      compatible_with: mod.compatible_with,
      incompatible_with: mod.incompatible_with,
      priority: mod.priority,
      output_type: mod.output_type,
      is_enabled: mod.is_enabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await marketplaceService.upsertSystemModule(form);
    setSaving(false);
    if (result.ok) {
      setDialogOpen(false);
      await load();
    }
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm(`Supprimer le module système "${moduleId}" ?`)) return;
    const result = await marketplaceService.deleteSystemModule(moduleId);
    if (result.ok) setModules((prev) => prev.filter((m) => m.module_id !== moduleId));
  };

  const handleSeed = async () => {
    setSeeding(true);
    const result = await marketplaceService.seedSystemModules();
    setSeeding(false);
    if (result.ok) await load();
  };

  const setFormField = <K extends keyof MarketplaceModuleUpsert>(
    key: K,
    value: MarketplaceModuleUpsert[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const parseList = (value: string) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Modules Marketplace (Système)
            </CardTitle>
            <CardDescription>
              Modules par défaut hérités par tous les projets
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sprout className="size-4" />
              )}
              Seed defaults
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={load}
            >
              <RefreshCw className="size-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={openCreate}>
                  <Plus className="size-4" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Modifier le module" : "Nouveau module système"}
                  </DialogTitle>
                  <DialogDescription>
                    {editing
                      ? "Modifiez les propriétés du module marketplace système."
                      : "Créez un nouveau module marketplace par défaut."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sys_module_id">ID Module</Label>
                      <Input
                        id="sys_module_id"
                        value={form.module_id}
                        onChange={(e) =>
                          setFormField("module_id", e.target.value)
                        }
                        disabled={!!editing}
                        placeholder="ex: upsell_premium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sys_name">Nom</Label>
                      <Input
                        id="sys_name"
                        value={form.name}
                        onChange={(e) => setFormField("name", e.target.value)}
                        placeholder="ex: Upsell Premium"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sys_description">Description</Label>
                    <Textarea
                      id="sys_description"
                      value={form.description}
                      onChange={(e) =>
                        setFormField("description", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sys_needs">
                        Besoins (séparés par virgule)
                      </Label>
                      <Input
                        id="sys_needs"
                        value={(form.needs ?? []).join(", ")}
                        onChange={(e) =>
                          setFormField("needs", parseList(e.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sys_priority">Priorité (0-100)</Label>
                      <Input
                        id="sys_priority"
                        type="number"
                        min={0}
                        max={100}
                        value={form.priority}
                        onChange={(e) =>
                          setFormField(
                            "priority",
                            parseInt(e.target.value) || 50
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sys_required_data">
                      Données requises (séparées par virgule)
                    </Label>
                    <Input
                      id="sys_required_data"
                      value={(form.required_data ?? []).join(", ")}
                      onChange={(e) =>
                        setFormField(
                          "required_data",
                          parseList(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_enabled ?? true}
                      onCheckedChange={(v) => setFormField("is_enabled", v)}
                    />
                    <Label>Actif</Label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={saving || !form.module_id || !form.name}
                  >
                    {saving && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    {editing ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {modules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                Aucun module système
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisez &quot;Seed defaults&quot; pour initialiser les modules
                par défaut.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((mod) => (
                  <TableRow
                    key={mod.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(mod)}
                  >
                    <TableCell className="font-mono text-sm">
                      {mod.module_id}
                    </TableCell>
                    <TableCell className="text-sm">{mod.name}</TableCell>
                    <TableCell className="text-sm">{mod.priority}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {mod.output_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mod.is_enabled ? (
                        <ToggleRight className="size-4 text-success" />
                      ) : (
                        <ToggleLeft className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(mod.module_id);
                        }}
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
