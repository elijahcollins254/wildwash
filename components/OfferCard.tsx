import Image from "next/image";
import Link from "next/link";
import type { Ref } from "react";

type OfferCardData = {
  id: number;
  title: string;
  description: string;
  image_url?: string | null;
  discount_percent?: number;
  discount_amount: number | string;
  code?: string;
};

type OfferCardProps = {
  offer: OfferCardData;
  isClaimed: boolean;
  onClaim?: () => void;
  claiming?: boolean;
  claimedAt?: string;
  isUsed?: boolean;
  className?: string;
  cardRef?: Ref<HTMLElement>;
};

export default function OfferCard({
  offer,
  isClaimed,
  onClaim,
  claiming = false,
  claimedAt,
  isUsed,
  className = "",
  cardRef,
}: OfferCardProps) {
  const discountAmount = Number(offer.discount_amount);
  const discountLabel = offer.discount_percent
    ? `${offer.discount_percent}% OFF`
    : `KSh ${discountAmount.toLocaleString("en-KE")} OFF`;

  return (
    <article
      ref={cardRef}
      className={`relative h-[180px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-md dark:border-slate-700 sm:h-[220px] ${className}`}
    >
      <Image
        src={offer.image_url || "/images/Clean%20Now%20Pay%20Later.png"}
        alt=""
        aria-hidden="true"
        width={1200}
        height={630}
        unoptimized
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5" />
      <div className="relative z-10 flex h-full flex-col justify-between p-3 sm:p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-white/80 sm:text-xs">
              Offer
            </p>
            {isClaimed && (
              <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-800 sm:text-xs">
                Claimed
              </span>
            )}
          </div>
          {offer.code && (
            <p className="mt-1 truncate text-[10px] text-white/75 sm:text-xs">
              Code: {offer.code}
            </p>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-xs font-black text-white sm:text-sm">{discountLabel}</span>
            {claimedAt && (
              <span className="mt-0.5 block text-[10px] text-white/75 sm:text-xs">
                Claimed {new Date(claimedAt).toLocaleDateString()}
              </span>
            )}
            {isClaimed && isUsed !== undefined && (
              <span className="mt-1 inline-block rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                {isUsed ? "Used" : "Available"}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/offers/${offer.id}`}
              className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-900 shadow-sm hover:bg-rose-50 sm:px-3 sm:text-xs"
            >
              View offer
            </Link>
            {!isClaimed && onClaim && (
              <button
                type="button"
                onClick={onClaim}
                disabled={claiming}
                className="rounded-lg bg-rose-700 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-rose-800 disabled:opacity-60 sm:px-3 sm:text-xs"
              >
                {claiming ? "..." : "Claim"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
