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
    void listenForOrderUpdates(
      controller.signal,
      () => onUpdateRef.current(),
      (error) => {
        console.error("[Order events] SSE connection failed:", error);
      },
    );

    return () => controller.abort();
  }, [enabled]);
}
