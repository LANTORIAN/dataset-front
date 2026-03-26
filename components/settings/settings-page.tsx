"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  User, Palette, Sun, Moon, Monitor, Save, KeyRound, Eye, EyeOff, Shield,
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { usersService } from "@/services/users.service";

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
