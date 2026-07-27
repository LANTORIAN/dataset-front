"use client";

import { useEffect, useState } from "react";
import { Wrench, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackendStatus } from "@/lib/hooks/use-backend-status";

export function BackendStatusBanner() {
  const status = useBackendStatus();

  // "offline" → affiche la bannière d'incident
  // "online" après avoir été "offline" → affiche brièvement la bannière de rétablissement
  const [show, setShow]             = useState(false);
  const [recovered, setRecovered]   = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (status === "offline") {
      setWasOffline(true); // eslint-disable-line react-hooks/set-state-in-effect
      setRecovered(false);
      setShow(true);
    }
    if (status === "online" && wasOffline) {
      setRecovered(true);
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
        setRecovered(false);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [status, wasOffline]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative z-[60] w-full flex items-center gap-3 px-5 py-2.5 border-b",
        recovered
          ? "bg-success/10 border-success/20"
          : "bg-sidebar border-sidebar-border"
      )}
    >
      {/* Indicateur animé */}
      {recovered ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
      ) : (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sidebar-primary opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sidebar-primary" />
        </span>
      )}

      {/* Message */}
      <p className={cn("text-xs flex-1 leading-snug", recovered ? "text-success" : "text-sidebar-foreground")}>
        {recovered ? (
          "Service rétabli — tout est de nouveau opérationnel."
        ) : (
          <>
            <span className="font-semibold">Interruption de service</span>
            {" · "}
            Notre équipe travaille activement au rétablissement.{" "}
            <span className="opacity-60">Certaines fonctionnalités peuvent être indisponibles.</span>
          </>
        )}
      </p>

      {/* Icône décorative droite */}
      {!recovered && (
        <Wrench className="size-3.5 shrink-0 text-sidebar-primary/60" />
      )}
    </div>
  );
}
