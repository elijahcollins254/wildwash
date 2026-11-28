import { client } from "@/lib/api/client";

const PENDING_CART_ADD_EVENTS_KEY = "wildwash_pending_cart_add_events";
const MAX_PENDING_CART_ADD_EVENTS = 100;

export interface CartAddEvent {
  event_id: string;
  service_id: number;
  user_id: string | null;
}

export function createCartAddEvent(
  serviceId: number,
  userId?: string | number,
): CartAddEvent {
  const eventId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return {
    event_id: eventId,
    service_id: serviceId,
    user_id: userId === undefined ? null : String(userId),
  };
}

export function queueCartAddEvent(event: CartAddEvent): void {
  try {
    const stored = localStorage.getItem(PENDING_CART_ADD_EVENTS_KEY);
    const pending: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(pending)) {
      throw new Error("Pending cart-add events have an invalid format.");
    }

    localStorage.setItem(
      PENDING_CART_ADD_EVENTS_KEY,
      JSON.stringify([...pending, event].slice(-MAX_PENDING_CART_ADD_EVENTS)),
    );
  } catch (error) {
    console.error("Unable to queue the cart-add event.", error);
  }
}

export async function flushPendingCartAddEvents(userId: string | number): Promise<void> {
  try {
    const stored = localStorage.getItem(PENDING_CART_ADD_EVENTS_KEY);
    if (!stored) return;

    const pending: unknown = JSON.parse(stored);
    if (!Array.isArray(pending) || !pending.every(isCartAddEvent)) {
      throw new Error("Pending cart-add events have an invalid format.");
    }
    const userEvents = pending.filter(
      (event) => event.user_id === null || event.user_id === String(userId),
    );
    if (userEvents.length === 0) return;

    await client.post("/users/cart-add-events/", {
      events: userEvents.map(({ event_id, service_id }) => ({ event_id, service_id })),
    });

    const sentEventIds = new Set(userEvents.map((event) => event.event_id));
    const latest: unknown = JSON.parse(
      localStorage.getItem(PENDING_CART_ADD_EVENTS_KEY) || "[]",
    );
    if (!Array.isArray(latest)) {
      throw new Error("Pending cart-add events have an invalid format.");
    }

    const remaining = latest.filter(
      (event): event is CartAddEvent =>
        isCartAddEvent(event) && !sentEventIds.has(event.event_id),
    );
    if (remaining.length > 0) {
      localStorage.setItem(PENDING_CART_ADD_EVENTS_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(PENDING_CART_ADD_EVENTS_KEY);
    }
  } catch (error) {
    console.error("Unable to save pending cart-add events.", error);
  }
}

function isCartAddEvent(value: unknown): value is CartAddEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "event_id" in value &&
    typeof value.event_id === "string" &&
    "service_id" in value &&
    typeof value.service_id === "number" &&
    Number.isSafeInteger(value.service_id) &&
    value.service_id > 0 &&
    "user_id" in value &&
    (typeof value.user_id === "string" || value.user_id === null)
  );
}
