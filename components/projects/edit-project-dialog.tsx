"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import { projectsService } from "@/services/projects.service";
import type { Project } from "@/types";

interface Props {
  project: Project;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Project) => void;
}

export function EditProjectDialog({ project, open, onClose, onSaved }: Props) {
  const cfg = project.config;

  const [name, setName]             = useState(project.name);
  const [description, setDesc]      = useState(project.description ?? "");
  const [assistantName, setAssName] = useState(cfg?.assistant_name ?? "");
  const [companyName, setCoName]    = useState(cfg?.company_name ?? "");
  const [assistantRole, setRole]    = useState(cfg?.assistant_role ?? "");
  const [assistantTone, setTone]    = useState(cfg?.assistant_tone ?? "");
  const [maxCtx, setMaxCtx]         = useState(String(cfg?.max_context_messages ?? 10));
  const [contactEmail, setContactEmail] = useState(cfg?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(cfg?.contact_phone ?? "");
  const [contactWeb, setContactWeb]     = useState(cfg?.contact_website ?? "");
  const [showAdvanced, setShowAdv]  = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const result = await projectsService.update(project.id, {
      name:                 name.trim(),
      description:          description.trim() || undefined,
      assistant_name:       assistantName.trim() || undefined,
      company_name:         companyName.trim() || undefined,
      assistant_role:       assistantRole.trim() || undefined,
      assistant_tone:       assistantTone.trim() || undefined,
      max_context_messages: parseInt(maxCtx, 10) || undefined,
      contact_email:       contactEmail.trim() || undefined,
      contact_phone:       contactPhone.trim() || undefined,
      contact_website:     contactWeb.trim() || undefined,
    });
    setLoading(false);
    if (result.ok) {
      onSaved(result.data);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le projet</DialogTitle>
          <DialogDescription>
            Modifiez les informations et la configuration de l&apos;assistant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom <span className="text-destructive">*</span></Label>
            <Input
              id="edit-name" value={name} maxLength={255} required
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc" value={description} placeholder="Optionnelle"
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <Separator />

          <button
            type="button"
            onClick={() => setShowAdv((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Configuration IA</span>
            {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ass-name" className="text-xs">Nom de l&apos;assistant</Label>
                  <Input id="edit-ass-name" placeholder="Assistant" value={assistantName}
                    onChange={(e) => setAssName(e.target.value)} maxLength={100} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-co-name" className="text-xs">Nom de l&apos;entreprise</Label>
                  <Input id="edit-co-name" placeholder="Company" value={companyName}
                    onChange={(e) => setCoName(e.target.value)} maxLength={255} className="h-8 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs">Rôle de l&apos;assistant</Label>
                <Input id="edit-role" placeholder="assistant" value={assistantRole}
                  onChange={(e) => setRole(e.target.value)} maxLength={255} className="h-8 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tone" className="text-xs">Ton de l&apos;assistant</Label>
                <Input id="edit-tone" placeholder="professionnel et clair" value={assistantTone}
                  onChange={(e) => setTone(e.target.value)} maxLength={255} className="h-8 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-ctx" className="text-xs">
                  Messages de contexte max <span className="text-muted-foreground">(1–50)</span>
                </Label>
                <Input id="edit-ctx" type="number" min={1} max={50} value={maxCtx}
                  onChange={(e) => setMaxCtx(String(Math.min(50, Math.max(1, Number(e.target.value)))))}
                  className="h-8 text-sm w-24" />
              </div>

              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Informations de contact (affichées par le chatbot)</p>

              <div className="space-y-1.5">
                <Label htmlFor="edit-contact-email" className="text-xs">Email de contact</Label>
                <Input id="edit-contact-email" type="email" placeholder="dev@bluevaloris.com" value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)} maxLength={255} className="h-8 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contact-phone" className="text-xs">Téléphone</Label>
                  <Input id="edit-contact-phone" placeholder="+33 1 23 45 67 89" value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)} maxLength={50} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contact-web" className="text-xs">Site web</Label>
                  <Input id="edit-contact-web" placeholder="https://bluevaloris.com" value={contactWeb}
                    onChange={(e) => setContactWeb(e.target.value)} maxLength={500} className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
