import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://api.wildwash.co.ke").replace(/\/+$/, "");
const SITE_ORIGIN = "https://www.wildwash.co.ke";
const FALLBACK_IMAGE = "/images/Clean%20Now%20Pay%20Later.png";

type Offer = {
  id: number;
  title: string;
  description: string;
  image_url?: string | null;
  discount_percent: number;
  discount_amount: number | string;
  code: string;
  valid_until: string | null;
};

function isOffer(value: unknown): value is Offer {
  if (!value || typeof value !== "object") return false;
  const offer = value as Record<string, unknown>;
  return (
    typeof offer.id === "number" &&
    typeof offer.title === "string" &&
    typeof offer.description === "string" &&
    (typeof offer.image_url === "string" || offer.image_url === null || offer.image_url === undefined) &&
    typeof offer.discount_percent === "number" &&
    (typeof offer.discount_amount === "number" || typeof offer.discount_amount === "string") &&
    typeof offer.code === "string" &&
    (typeof offer.valid_until === "string" || offer.valid_until === null)
  );
}

async function getOffer(id: string): Promise<Offer | null> {
  const response = await fetch(`${API_BASE}/offers/${id}`, { next: { revalidate: 300 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Offer request failed (${response.status}).`);

  const payload: unknown = await response.json();
  if (!isOffer(payload)) throw new Error("The offer response had an unexpected format.");
  return payload;
}

function getShareImageUrl(offer: Offer) {
  const source = offer.image_url?.trim();
  if (!source) return FALLBACK_IMAGE;
  try {
    const imageUrl = new URL(source, `${API_BASE}/`);
    if (imageUrl.protocol === "https:" || imageUrl.protocol === "http:") {
      return imageUrl.toString();
    }
  } catch {
    console.warn(`Invalid share image URL for offer ${offer.id}.`);
  }
  return FALLBACK_IMAGE;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Offer not found | Wild Wash" };

  try {
    const offer = await getOffer(id);
    if (!offer) return { title: "Offer not found | Wild Wash" };

    const title = `${offer.title} | Wild Wash Offers`;
    const description = offer.description.trim().slice(0, 200) || "Discover offers from Wild Wash.";
    const url = `${SITE_ORIGIN}/offers/${id}`;
    const imageUrl = getShareImageUrl(offer);
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
        images: [{ url: imageUrl, alt: `${offer.title} offer from Wild Wash` }],
      },
      twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
    };
  } catch (error) {
    console.error(`Unable to generate share metadata for offer ${id}:`, error);
    return {
      title: "Wild Wash Offers",
      description: "Discover current laundry and home-care offers from Wild Wash.",
    };
  }
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const offer = await getOffer(id);
  if (!offer) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-lg dark:bg-slate-900">
        <Image
          src={getShareImageUrl(offer)}
          alt={offer.title}
          width={1200}
          height={630}
          unoptimized
          className="max-h-[420px] w-full object-cover"
        />
        <div className="p-6 sm:p-9">
          <p className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
            {offer.discount_percent > 0
              ? `${offer.discount_percent}% OFF`
              : `KSh ${Number(offer.discount_amount).toLocaleString("en-KE")} OFF`}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold">{offer.title}</h1>
          <p className="mt-3 whitespace-pre-line text-slate-600 dark:text-slate-300">{offer.description}</p>
          <p className="mt-5 text-sm text-slate-500">Use code: <strong>{offer.code}</strong></p>
          {offer.valid_until ? (
            <p className="mt-2 text-sm text-slate-500">
              Valid until {new Date(offer.valid_until).toLocaleDateString("en-KE")}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/offers?claim_offer=${offer.id}`}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
            >
              Claim this offer
            </Link>
            <Link href="/offers" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold dark:border-slate-700">
              Browse all offers
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
