"use client";

import { useEffect, useState } from "react";

export type BackendStatus = "idle" | "online" | "offline";

const POLL_INTERVAL = 30_000; // 30 s

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}
