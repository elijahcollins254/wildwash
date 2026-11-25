import { useEffect, useRef } from "react";
import { listenForOrderUpdates } from "@/lib/api/orderEvents";

export function useOrderEvents(
  onUpdate: () => void,
  enabled = true,
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => onUpdateRef.current(), 250);
    };
    void listenForOrderUpdates(
      controller.signal,
      scheduleRefresh,
      (error) => {
        console.error("[Order events] SSE connection failed:", error);
      },
    );

    document.addEventListener("visibilitychange", scheduleRefresh);
    return () => {
      controller.abort();
      window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", scheduleRefresh);
    };
  }, [enabled]);
}
