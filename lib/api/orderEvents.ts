import { getApiAuthToken } from "./client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function isOrderUpdate(frame: string): boolean {
  let eventType = "";
  let data = "";

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += `${data ? "\n" : ""}${line.slice(5).trimStart()}`;
    }
  }

  if (eventType !== "order_update") return false;
  const payload: unknown = JSON.parse(data);
  if (
    !payload ||
    typeof payload !== "object" ||
    !("order_id" in payload) ||
    (payload.order_id !== null && typeof payload.order_id !== "number")
  ) {
    throw new Error("The order event contained an invalid payload.");
  }

  return true;
}

function waitBeforeReconnect(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, delay);
    const cancel = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      resolve();
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function listenForOrderUpdates(
  signal: AbortSignal,
  onUpdate: () => void,
  onError: (error: Error) => void,
) {
  let retryDelay = 1000;
  let outageReported = false;

  while (!signal.aborted) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const token = getApiAuthToken();
      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(`${API_BASE}/orders/events/`, {
        headers: { Authorization: `Token ${token}` },
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        const error = new Error(`Live order updates failed (${response.status}).`);
        if ([400, 401, 403, 404].includes(response.status)) {
          onError(error);
          return;
        }
        throw error;
      }

      if (!response.body) {
        throw new Error("The live order connection did not provide a response stream.");
      }

      reader = response.body.getReader();
      retryDelay = 1000;
      outageReported = false;

      const decoder = new TextDecoder();
      let buffer = "";

      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const boundary = /\r?\n\r?\n/.exec(buffer);
          if (!boundary || boundary.index === undefined) break;

          const frame = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          if (isOrderUpdate(frame)) onUpdate();
        }
      }
    } catch (error) {
      if (signal.aborted) return;
      if (!outageReported) {
        onError(
          error instanceof Error
            ? error
            : new Error("The live order connection was interrupted."),
        );
        outageReported = true;
      }
    } finally {
      reader?.releaseLock();
    }

    await waitBeforeReconnect(retryDelay, signal);
    retryDelay = Math.min(retryDelay * 2, 30000);
  }
}
