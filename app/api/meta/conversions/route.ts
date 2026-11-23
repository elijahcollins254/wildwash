import { NextRequest, NextResponse } from "next/server";
import type { MetaEventName } from "@/lib/metaConversions";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || "1155299660416025";
const EVENT_NAMES = new Set<MetaEventName>([
  "Search",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
]);
const ALLOWED_CUSTOM_FIELDS: Record<MetaEventName, Set<string>> = {
  Search: new Set(["search_string"]),
  ViewContent: new Set(["content_ids", "content_name", "content_type", "currency", "value", "contents", "num_items"]),
  AddToCart: new Set(["content_ids", "content_name", "content_type", "currency", "value", "contents", "num_items"]),
  InitiateCheckout: new Set(["content_ids", "content_type", "currency", "value", "contents", "num_items"]),
  Purchase: new Set(["content_ids", "content_type", "currency", "value", "contents", "num_items"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeCustomData(eventName: MetaEventName, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};

  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (!ALLOWED_CUSTOM_FIELDS[eventName].has(key)) continue;

    if (key === "content_ids" && Array.isArray(field)) {
      result[key] = field
        .filter((id): id is string => typeof id === "string")
        .slice(0, 50)
        .map((id) => id.slice(0, 100));
    } else if (key === "contents" && Array.isArray(field)) {
      result[key] = field.slice(0, 50).flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string") return [];
        const quantity = item.quantity;
        const itemPrice = item.item_price;
        if (
          typeof quantity !== "number" ||
          quantity <= 0 ||
          typeof itemPrice !== "number" ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(itemPrice) ||
          itemPrice < 0
        ) return [];
        return [{ id: item.id.slice(0, 100), quantity, item_price: itemPrice }];
      });
    } else if (key === "value" || key === "num_items") {
      if (typeof field === "number" && Number.isFinite(field) && field >= 0) result[key] = field;
    } else if (typeof field === "string") {
      if (key !== "currency" || /^[A-Z]{3}$/.test(field)) {
        result[key] = field.slice(0, 500);
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  if (request.cookies.get("wildwash_marketing_consent")?.value !== "granted") {
    return NextResponse.json({ error: "Marketing consent is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body) ||
      typeof body.event_name !== "string" ||
      !EVENT_NAMES.has(body.event_name as MetaEventName) ||
      typeof body.event_id !== "string" ||
      body.event_id.length < 1 ||
      body.event_id.length > 100 ||
      typeof body.event_source_url !== "string") {
    return NextResponse.json({ error: "Invalid Conversions API event." }, { status: 400 });
  }

  let eventSourceUrl: URL;
  try {
    eventSourceUrl = new URL(body.event_source_url);
  } catch {
    return NextResponse.json({ error: "Invalid event source URL." }, { status: 400 });
  }
  if (eventSourceUrl.origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Event source URL must match this site." }, { status: 400 });
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const apiVersion = process.env.META_CAPI_API_VERSION;
  if (!accessToken || !apiVersion || !/^v\d+\.\d+$/.test(apiVersion) || !/^\d+$/.test(PIXEL_ID)) {
    console.error("Meta Conversions API is not configured. Set META_CAPI_ACCESS_TOKEN and META_CAPI_API_VERSION.");
    return NextResponse.json({ error: "Conversions API is not configured." }, { status: 503 });
  }

  const userData: Record<string, string> = {};
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim();
  if (userAgent) userData.client_user_agent = userAgent.slice(0, 1000);
  if (clientIp) userData.client_ip_address = clientIp;

  const event = {
    event_name: body.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    action_source: "website",
    event_source_url: `${eventSourceUrl.origin}${eventSourceUrl.pathname}`,
    ...(Object.keys(userData).length > 0 ? { user_data: userData } : {}),
    custom_data: sanitizeCustomData(body.event_name as MetaEventName, body.custom_data),
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${PIXEL_ID}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [event] }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Meta Conversions API rejected an event:", response.status, details.slice(0, 1000));
      return NextResponse.json({ error: "Meta rejected the event." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta Conversions API request failed:", error);
    return NextResponse.json({ error: "Unable to deliver the event to Meta." }, { status: 502 });
  }
}
