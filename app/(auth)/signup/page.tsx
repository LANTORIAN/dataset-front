"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/context/auth-context";
import { MindLogo } from "@/components/branding/mind-logo";

export default function SignupPage() {
  const { signup } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || password.length < 8) return;
    setLoading(true);
    setError(null);

    const result = await signup(username.trim(), password);
    setLoading(false);

    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error ?? "Erreur lors de la création du compte");
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-xl bg-warning-surface p-3">
              <Clock className="size-6 text-warning-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Compte créé</CardTitle>
          <CardDescription>Votre demande est en attente de validation</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2 text-center">
          <p>
            Un administrateur doit approuver votre compte avant que vous puissiez vous connecter.
          </p>
          <p>Vous serez notifié par email une fois approuvé.</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="rounded-xl bg-primary/10 p-3">
            <MindLogo className="size-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl">Créer un compte</CardTitle>
        <CardDescription>
          Après inscription, un admin doit valider votre accès.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Nom d&apos;utilisateur</Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder="votre_login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">3 à 50 caractères</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                tabIndex={-1}
                className="absolute right-1 top-1 size-7 text-muted-foreground"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Répétez le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              className={mismatch ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {mismatch && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !username.trim() || password.length < 8 || mismatch}
          >
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Créer mon compte
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
