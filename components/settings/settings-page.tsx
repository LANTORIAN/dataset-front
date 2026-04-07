"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  User, Palette, Sun, Moon, Monitor, Save, KeyRound, Eye, EyeOff, Shield,
  Mail, Send,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { usersService } from "@/services/users.service";
import {
  adminSettingsService,
  type SmtpSettings,
  type DbAssistantVisibilitySettings,
} from "@/services/admin-settings.service";
import { MindLogo } from "@/components/branding/mind-logo";

const THEME_OPTIONS = [
  { value: "light",  label: "Clair",   icon: Sun },
  { value: "dark",   label: "Sombre",  icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, refreshUser, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Profile state — initialized from context user
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [email, setEmail]             = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Keep form in sync if user changes
  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords]     = useState(false);
  const [savingPassword, setSavingPassword]   = useState(false);

  // SMTP state (admin only)
  const [smtp, setSmtp] = useState<SmtpSettings>({
    smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "", smtp_from: "", support_email: "",
  });
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // DB assistant visibility (admin only)
  const [dbVisibility, setDbVisibility] = useState<DbAssistantVisibilitySettings>({
    enabled: true,
    allow_global_tables: false,
    include_tables: [],
    exclude_tables: [],
    include_columns: [],
    exclude_columns: [],
  });
  const [dbVisibilityLoaded, setDbVisibilityLoaded] = useState(false);
  const [savingDbVisibility, setSavingDbVisibility] = useState(false);

  const [includeTablesText, setIncludeTablesText] = useState("");
  const [excludeTablesText, setExcludeTablesText] = useState("");
  const [includeColumnsText, setIncludeColumnsText] = useState("");
  const [excludeColumnsText, setExcludeColumnsText] = useState("");

  const parseCsv = (value: string) => value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  useEffect(() => {
    if (isAdmin && !smtpLoaded) {
      adminSettingsService.getSmtp().then((r) => {
        if (r.ok) { setSmtp(r.data); setSmtpLoaded(true); }
      });
    }
  }, [isAdmin, smtpLoaded]);

  useEffect(() => {
    if (isAdmin && !dbVisibilityLoaded) {
      adminSettingsService.getDbAssistantVisibility().then((r) => {
        if (!r.ok) return;
        setDbVisibility(r.data);
        setIncludeTablesText(r.data.include_tables.join(", "));
        setExcludeTablesText(r.data.exclude_tables.join(", "));
        setIncludeColumnsText(r.data.include_columns.join(", "));
        setExcludeColumnsText(r.data.exclude_columns.join(", "));
        setDbVisibilityLoaded(true);
      });
    }
  }, [isAdmin, dbVisibilityLoaded]);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    await adminSettingsService.updateSmtp(smtp);
    setSavingSmtp(false);
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    await adminSettingsService.testSmtp();
    setTestingSmtp(false);
  };

  const handleSaveDbVisibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDbVisibility(true);

    const payload: Partial<DbAssistantVisibilitySettings> = {
      enabled: dbVisibility.enabled,
      allow_global_tables: dbVisibility.allow_global_tables,
      include_tables: parseCsv(includeTablesText),
      exclude_tables: parseCsv(excludeTablesText),
      include_columns: parseCsv(includeColumnsText),
      exclude_columns: parseCsv(excludeColumnsText),
    };

    const result = await adminSettingsService.updateDbAssistantVisibility(payload);
    if (result.ok) setDbVisibility(result.data.settings);
    setSavingDbVisibility(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const result = await usersService.updateProfile({
      display_name: displayName.trim() || undefined,
      email: email.trim() || undefined,
    });
    if (result.ok) await refreshUser();
    setSavingProfile(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setSavingPassword(true);
    const result = await usersService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const initials = (user?.display_name ?? user?.username ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre profil et vos préférences d&apos;affichage.
        </p>
      </div>

      {/* ── Profil ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Informations du profil</CardTitle>
          </div>
          <CardDescription>Votre nom et adresse email visibles dans l&apos;application.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.display_name ?? user?.username ?? "—"}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {isAdmin ? "Super Admin" : "Utilisateur"}
                  </Badge>
                  {isAdmin && (
                    <Badge variant="default" className="text-xs gap-1">
                      <Shield className="size-2.5" />Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="username">Nom d&apos;utilisateur</Label>
              <Input id="username" value={user?.username ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Le nom d&apos;utilisateur ne peut pas être modifié.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Nom affiché</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={savingProfile} className="gap-2">
                <Save className="size-3.5" />
                {savingProfile ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Mot de passe ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Mot de passe</CardTitle>
          </div>
          <CardDescription>Modifiez votre mot de passe de connexion.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 size-7 text-muted-foreground"
                  onClick={() => setShowPasswords((v) => !v)}
                  tabIndex={-1}
                >
                  {showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caractères"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmer</Label>
                <Input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  className={
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
              </div>
            </div>

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={savingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="gap-2"
              >
                <Save className="size-3.5" />
                {savingPassword ? "Modification…" : "Modifier le mot de passe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── SMTP (admin only) ── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Configuration SMTP</CardTitle>
            </div>
            <CardDescription>Paramètres d&apos;envoi d&apos;emails (notifications, support, vérification).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-host">Serveur SMTP</Label>
                  <Input id="smtp-host" value={smtp.smtp_host} placeholder="smtp.gmail.com"
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input id="smtp-port" value={smtp.smtp_port} placeholder="587"
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-user">Utilisateur SMTP</Label>
                  <Input id="smtp-user" value={smtp.smtp_user} placeholder="noreply@bluevaloris.com"
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-password">Mot de passe SMTP</Label>
                  <Input id="smtp-password" type="password" value={smtp.smtp_password} placeholder="••••••••"
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_password: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from">Adresse expéditeur</Label>
                  <Input id="smtp-from" type="email" value={smtp.smtp_from} placeholder="noreply@bluevaloris.com"
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_from: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-email">Email support (destinataire tickets)</Label>
                  <Input id="support-email" type="email" value={smtp.support_email} placeholder="dev@bluevaloris.com"
                    onChange={(e) => setSmtp((s) => ({ ...s, support_email: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleTestSmtp} disabled={testingSmtp} className="gap-2">
                  <Send className="size-3.5" />
                  {testingSmtp ? "Envoi…" : "Tester"}
                </Button>
                <Button type="submit" size="sm" disabled={savingSmtp} className="gap-2">
                  <Save className="size-3.5" />
                  {savingSmtp ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── DB Assistant visibility (admin only) ── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MindLogo className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Visibilité base de données (Assistant)</CardTitle>
            </div>
            <CardDescription>
              Définissez quelles tables/colonnes l&apos;assistant peut exposer dans ses réponses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDbVisibility} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="db-enabled">Assistant DB activé</Label>
                    <Switch
                      id="db-enabled"
                      checked={dbVisibility.enabled}
                      onCheckedChange={(checked) => setDbVisibility((s) => ({ ...s, enabled: checked }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Désactive complètement les réponses basées sur les tables SQL.
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="db-global">Autoriser tables globales</Label>
                    <Switch
                      id="db-global"
                      checked={dbVisibility.allow_global_tables}
                      onCheckedChange={(checked) => setDbVisibility((s) => ({ ...s, allow_global_tables: checked }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Autorise l&apos;accès aux tables sans <code>project_id</code> (à utiliser avec prudence).
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="db-include-tables">Tables autorisées (CSV)</Label>
                  <Input
                    id="db-include-tables"
                    value={includeTablesText}
                    onChange={(e) => setIncludeTablesText(e.target.value)}
                    placeholder="projects, conversations, rag_files"
                  />
                  <p className="text-xs text-muted-foreground">Si renseigné, agit comme whitelist de tables.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="db-exclude-tables">Tables bloquées (CSV)</Label>
                  <Input
                    id="db-exclude-tables"
                    value={excludeTablesText}
                    onChange={(e) => setExcludeTablesText(e.target.value)}
                    placeholder="users, audit_logs"
                  />
                  <p className="text-xs text-muted-foreground">Prioritaire sur la liste autorisée.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="db-include-columns">Colonnes autorisées (CSV)</Label>
                  <Input
                    id="db-include-columns"
                    value={includeColumnsText}
                    onChange={(e) => setIncludeColumnsText(e.target.value)}
                    placeholder="name, status, projects.description"
                  />
                  <p className="text-xs text-muted-foreground">Format accepté: <code>colonne</code> ou <code>table.colonne</code>.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="db-exclude-columns">Colonnes bloquées (CSV)</Label>
                  <Input
                    id="db-exclude-columns"
                    value={excludeColumnsText}
                    onChange={(e) => setExcludeColumnsText(e.target.value)}
                    placeholder="email, phone, users.display_name"
                  />
                  <p className="text-xs text-muted-foreground">Les colonnes sensibles restent masquées de toute façon.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingDbVisibility} className="gap-2">
                  <Save className="size-3.5" />
                  {savingDbVisibility ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Thème ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Apparence</CardTitle>
          </div>
          <CardDescription>Choisissez le thème d&apos;affichage de l&apos;application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all hover:bg-accent",
                  mounted && theme === option.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                <option.icon className="size-5" />
                {option.label}
                {mounted && theme === option.value && (
                  <span className="text-xs font-normal opacity-70">Actif</span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
