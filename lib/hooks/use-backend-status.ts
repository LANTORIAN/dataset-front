"use client";

import { useEffect, useState } from "react";

export type BackendStatus = "idle" | "online" | "offline";

const ONLINE_POLL_INTERVAL = 120_000;
const OFFLINE_POLL_INTERVAL = 15_000;
const REQUEST_TIMEOUT = 4_000;

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearScheduledCheck = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const scheduleNextCheck = (nextStatus: BackendStatus) => {
      if (cancelled || document.visibilityState === "hidden") return;
      clearScheduledCheck();
      const delay = nextStatus === "online" ? ONLINE_POLL_INTERVAL : OFFLINE_POLL_INTERVAL;
      timeoutId = setTimeout(check, delay);
    };

    const check = async () => {
      if (cancelled || document.visibilityState === "hidden") return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      let nextStatus: BackendStatus = "offline";

      try {
        const res = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        nextStatus = res.ok ? "online" : "offline";
      } catch {
        nextStatus = "offline";
      } finally {
        clearTimeout(timeout);
      }

      if (!cancelled) {
        setStatus(nextStatus);
        scheduleNextCheck(nextStatus);
      }
    };

    const handleVisibilityChange = () => {
      clearScheduledCheck();
      if (document.visibilityState === "visible") {
        void check();
      }
    };

    void check();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearScheduledCheck();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return status;
}
