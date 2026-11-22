import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getImageForService } from "@/lib/services/images";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://api.wildwash.co.ke").replace(/\/+$/, "");
const SITE_ORIGIN = "https://www.wildwash.co.ke";

type ShareableService = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
};

function isShareableService(value: unknown): value is ShareableService {
  if (!value || typeof value !== "object") return false;
  const service = value as Record<string, unknown>;
  return (
    typeof service.id === "number" &&
    typeof service.name === "string" &&
    (typeof service.description === "string" || service.description === null) &&
    (typeof service.image_url === "string" || service.image_url === null)
  );
}

function getShareImageUrl(service: ShareableService): string {
  const source = service.image_url?.trim();
  if (source) {
    try {
      const imageUrl = new URL(source, `${API_BASE}/`);
      if (imageUrl.protocol === "https:" || imageUrl.protocol === "http:") {
        return imageUrl.toString();
      }
    } catch {
      console.warn(`Invalid share image URL for service ${service.id}.`);
    }
  }

  return `/images/${encodeURIComponent(getImageForService(service.name))}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return { title: "Service not found | Wild Wash" };
  }

  try {
    const response = await fetch(`${API_BASE}/services/${id}/`, {
      next: { revalidate: 300 },
    });
    if (response.status === 404) {
      return { title: "Service not found | Wild Wash" };
    }
    if (!response.ok) {
      throw new Error(`Service metadata request failed (${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (!isShareableService(payload)) {
      throw new Error("The service metadata response had an unexpected format.");
    }

    const title = `${payload.name} | Wild Wash`;
    const description = payload.description?.trim()
      ? payload.description.trim().slice(0, 200)
      : `Book ${payload.name} with Wild Wash.`;
    const url = `${SITE_ORIGIN}/services/${id}`;
    const imageUrl = getShareImageUrl(payload);

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "Wild Wash",
        type: "website",
        images: [{ url: imageUrl, alt: `${payload.name} by Wild Wash` }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error(`Unable to generate share metadata for service ${id}:`, error);
    return {
      title: "Wild Wash Services",
      description: "Explore laundry and home-care services from Wild Wash.",
    };
  }
}

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return children;
}
