"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import { AUTH_EXPIRED_EVENT, tokenStore } from "@/lib/api/client";
import type { UserResponse } from "@/types";

// ── Context shape ──────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router    = useRouter();
  // Empêche le double-fire de l'effet en React StrictMode (dev)
  const attempted = useRef(false);

  /**
   * Charge le profil utilisateur une seule fois au montage.
   * - Token en mémoire présent (navigation SPA) → /me direct
   * - Token absent (rechargement page) → refresh silencieux via cookie HttpOnly
   * authService.refresh() est un singleton : N appelants concurrents
   * partagent la même Promise, aucun appel réseau dupliqué.
   */
  const loadUser = useCallback(async () => {
    if (attempted.current) return;
    attempted.current = true;

    // 1. Token déjà en mémoire (SPA, pas de rechargement)
    if (tokenStore.get()) {
      const r = await usersService.me();
      if (r.ok) { setUser(r.data); setIsLoading(false); return; }
      tokenStore.clear(); // token périmé
    }

    // 2. Refresh silencieux via cookie HttpOnly
    const refreshed = await authService.refresh();
    if (refreshed.ok) {
      const r2 = await usersService.me();
      if (r2.ok) setUser(r2.data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null);
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith("/login")) {
          router.replace("/login?reason=session_expired");
        }
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, [router]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authService.login({ username, password });
    if (!result.ok) return { ok: false, error: result.error };

    const r = await usersService.me();
    if (r.ok) setUser(r.data);
    return { ok: true };
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    const result = await authService.signup({ username, password });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const r = await usersService.me();
    if (r.ok) setUser(r.data);
  }, []);

  // useMemo évite de recréer l'objet context à chaque render sauf si les dépendances changent
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "super_admin",
    login,
    signup,
    logout,
    refreshUser,
  }), [user, isLoading, login, signup, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
