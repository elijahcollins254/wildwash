export type MetaEventName = "Search" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

type MetaEventData = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function getServiceMetaData(service: {
  id: number;
  name: string;
  price: string | number;
}): MetaEventData {
  const price = Number(service.price);
  const hasValidPrice = Number.isFinite(price) && price >= 0;

  return {
    content_ids: [String(service.id)],
    content_name: service.name,
    content_type: "product",
    ...(hasValidPrice
      ? {
          currency: "KES",
          value: price,
          contents: [{ id: String(service.id), quantity: 1, item_price: price }],
        }
      : {}),
    num_items: 1,
  };
}

export async function trackMetaEvent(
  eventName: MetaEventName,
  customData: MetaEventData = {},
  eventId?: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !document.cookie.split("; ").includes("wildwash_marketing_consent=granted")) {
    return false;
  }

  const resolvedEventId = eventId ??
    (typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  window.fbq?.("track", eventName, customData, { eventID: resolvedEventId });

  try {
    const response = await fetch("/api/meta/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        event_id: resolvedEventId,
        event_source_url: `${window.location.origin}${window.location.pathname}`,
        custom_data: customData,
      }),
    });

    if (!response.ok) {
      console.error("Meta Conversions API event failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to send Meta Conversions API event:", error);
    return false;
  }
}
