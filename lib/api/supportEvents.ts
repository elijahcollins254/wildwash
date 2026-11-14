import { getApiAuthToken } from "./client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export type SupportMessage = {
  id: number;
  body: string;
  is_from_support: boolean;
  created_at: string;
};

function parseSupportEvent(frame: string): SupportMessage | null {
  let eventType = "";
  let data = "";

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += `${data ? "\n" : ""}${line.slice(5).trimStart()}`;
    }
  }

  if (!data || eventType !== "support_message") return null;

  const message: unknown = JSON.parse(data);
  if (
    !message ||
    typeof message !== "object" ||
    !("id" in message) ||
    typeof message.id !== "number" ||
    !("body" in message) ||
    typeof message.body !== "string" ||
    !("is_from_support" in message) ||
    message.is_from_support !== true ||
    !("created_at" in message) ||
    typeof message.created_at !== "string"
  ) {
    throw new Error("The support event contained an invalid message.");
  }

  return {
    id: message.id,
    body: message.body,
    is_from_support: message.is_from_support,
    created_at: message.created_at,
  };
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

export async function listenForSupportMessages(
  initialLastEventId: number,
  signal: AbortSignal,
  onMessage: (message: SupportMessage) => void,
  onError: (error: Error) => void,
  onConnected?: () => void,
) {
  let lastEventId = initialLastEventId;
  let retryDelay = 1000;
  let outageReported = false;

  while (!signal.aborted) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const token = getApiAuthToken();
      if (!token) {
        onError(new Error("Your support chat session has expired. Please sign in again."));
        return;
      }

      const response = await fetch(`${API_BASE}/chat/events/`, {
        headers: {
          Authorization: `Token ${token}`,
          "Last-Event-ID": String(lastEventId),
        },
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        const error = new Error(`Live chat connection failed (${response.status}).`);
        if ([400, 401, 403, 404].includes(response.status)) {
          onError(error);
          return;
        }
        throw error;
      }

      if (!response.body) {
        throw new Error("The live chat connection did not provide a response stream.");
      }

      reader = response.body.getReader();
      retryDelay = 1000;
      outageReported = false;
      onConnected?.();

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
          const message = parseSupportEvent(frame);
          if (!message || message.id <= lastEventId) continue;

          lastEventId = message.id;
          onMessage(message);
        }
      }
    } catch (error) {
      if (signal.aborted) return;
      if (!outageReported) {
        onError(
          error instanceof Error
            ? error
            : new Error("The live chat connection was interrupted."),
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
