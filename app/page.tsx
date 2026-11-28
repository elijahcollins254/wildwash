'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  CubeTransparentIcon,
  HomeModernIcon,
  BugAntIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  TrashIcon,
  WrenchIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  TagIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch } from "@/redux/hooks";
import { addToCart } from "@/redux/features/cartSlice";
import { useGetServicesQuery } from "@/redux/services/apiSlice";
import type { Service } from "@/redux/services/apiSlice";
import type { RootState } from "@/redux/store";
import { client } from "@/lib/api/client";
import { createCartAddEvent, flushPendingCartAddEvents, queueCartAddEvent } from "@/lib/cartActivity";
import { getServiceMetaData, trackMetaEvent } from "@/lib/metaConversions";
import StableImage from "@/components/StableImage";
import OfferCard from "@/components/OfferCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const TRUSTED_USER_OFFSET = 533432;

function readTrustedUserCount(value: unknown): number {
  if (!value || typeof value !== "object" || !("count" in value)) {
    throw new Error("The user count response has an invalid shape.");
  }

  const count = value.count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("The user count response contains an invalid count.");
  }

  return count;
}

type Offer = {
  id: number;
  title: string;
  description: string;
  discount_percent: number;
  discount_amount: number;
  code?: string;
  is_claimed?: boolean;
  image_url?: string | null;
  is_active: boolean;
  valid_from?: string;
  valid_until: string | null;
};

type Banner = {
  id: number;
  title: string;
  image_url: string;
  button_text?: string;
  link_url: string;
  is_active: boolean;
  valid_from?: string;
  valid_until: string | null;
  sort_order: number;
};

type CarouselItem =
  | { kind: "offer"; data: Offer }
  | { kind: "banner"; data: Banner };

const isOffer = (
  value: unknown,
): value is Omit<Offer, "discount_amount"> & { discount_amount: number | string } => {
  if (!value || typeof value !== "object") return false;
  const offer = value as Record<string, unknown>;
  return (
    typeof offer.id === "number" &&
    typeof offer.title === "string" &&
    typeof offer.description === "string" &&
    (typeof offer.image_url === "string" || offer.image_url === null || offer.image_url === undefined) &&
    typeof offer.discount_percent === "number" &&
    (typeof offer.discount_amount === "number" ||
      (typeof offer.discount_amount === "string" &&
        offer.discount_amount.trim() !== "" &&
        Number.isFinite(Number(offer.discount_amount)))) &&
    typeof offer.is_active === "boolean" &&
    (typeof offer.valid_from === "string" || offer.valid_from === undefined) &&
    (typeof offer.valid_until === "string" || offer.valid_until === null)
  );
};



// Extended service type with UI properties (omit icon from Service since we're replacing it)
type ServiceWithUI = Omit<Service, 'icon'> & {
  icon: React.ComponentType<any>;
  image_url: string | null;
};

// Map service names to image files with intelligent fallback
const serviceImageMap: Record<string, string> = {
  "Standard Wash": "Standard Wash.png",
  "Express Wash": "Express Wash.png",
  "Dry Cleaning": "Dry Cleaning.png",
  "Duvet Cleaning": "Duvet Cleaning.png",
  "Carpet Cleaning": "Carpet Cleaning.png",
  "Ironing Service": "Ironing Service.png",
  "Bedsitter Fumigation": "Bedsitter Fumigation.png",
  "Storage Services": "Storage.png",
  "Repairs": "Repairs.png",
  "Moving Services": "Moving.png",
  "Sofa Cleaning": "Sofa Cleaning.png",
  "House Cleaning": "House Cleaning.png",
  "Mattress Cleaning": "Mattress Cleaning.png",
  "Shoes Cleaning": "Shoes Cleaning.png",
  "Folding Service": "Folding Service.png",
  "Shirt Cleaning": "Shirt Cleaning.png",
  "Bedsheet Cleaning": "Bedsheet Cleaning.png",
  "Jacket Cleaning": "Jacket Cleaning.png",
  "Trenchcoat Cleaning": "Trenchcoat Cleaning.png",
  "Trouser Cleaning": "Trouser Cleaning.png",
};

function getImageForService(serviceName: string): string {
  if (serviceImageMap[serviceName]) return serviceImageMap[serviceName];
  const nameLower = serviceName.toLowerCase();
  if (nameLower.includes("storage")) return "Storage.png";
  if (nameLower.includes("repair")) return "Repairs.png";
  if (nameLower.includes("moving")) return "Moving.png";
  if (nameLower.includes("sofa")) return "Sofa Cleaning.png";
  if (nameLower.includes("house")) return "House Cleaning.png";
  if (nameLower.includes("mattress")) return "Mattress Cleaning.png";
  if (nameLower.includes("shoes")) return "Shoes Cleaning.png";
  if (nameLower.includes("folding")) return "Folding Service.png";
  if (nameLower.includes("shirt")) return "Shirt Cleaning.png";
  if (nameLower.includes("bedsheet")) return "Bedsheet Cleaning.png";
  if (nameLower.includes("jacket")) return "Jacket Cleaning.png";
  if (nameLower.includes("trenchcoat")) return "Trenchcoat Cleaning.png";
  if (nameLower.includes("trouser")) return "Trouser Cleaning.png";
  if (nameLower.includes("tv") || nameLower.includes("mounting")) return "Tv Installation.png";
  if (nameLower.includes("hotshower") || nameLower.includes("hot shower")) return "Shower Installation.png";
  if (nameLower.includes("fumigation") || nameLower.includes("bedsitter"))
    return "Bedsitter Fumigation.png";
  if (nameLower.includes("carpet")) return "Carpet Cleaning.png";
  if (nameLower.includes("duvet")) return "Duvet Cleaning.png";
  if (nameLower.includes("iron")) return "Ironing Service.png";
  if (nameLower.includes("dry") || nameLower.includes("dryclean"))
    return "Dry Cleaning.png";
  if (nameLower.includes("laundry")) return "Laundry Cleaning.png";
  if (nameLower.includes("express")) return "Express Wash.png";
  if (nameLower.includes("wash") || nameLower.includes("clean"))
    return "Standard Wash.png";
  return "Standard Wash.png";
}

function getIconForCategory(category: string): React.ComponentType<any> {
  const categoryLower = category?.toLowerCase() || '';
  if (categoryLower.includes('laundry')) return CheckBadgeIcon;
  if (categoryLower.includes('duvet')) return CubeTransparentIcon;
  if (categoryLower.includes('carpet')) return TrashIcon;
  if (categoryLower.includes('house')) return HomeModernIcon;
  if (categoryLower.includes('fumigation')) return BugAntIcon;
  if (categoryLower.includes('installation') || categoryLower.includes('mounting') || categoryLower.includes('shower')) return WrenchIcon;
  return SparklesIcon;
}

export default function HomePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const user = useSelector((state: RootState) => state.auth.user);
  const [trustedUserCount, setTrustedUserCount] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const hasActiveFilters = Boolean(searchTerm.trim() || selectedCategory);
  const [addedItem, setAddedItem] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activePromo, setActivePromo] = useState(0);
  const [serviceColumns, setServiceColumns] = useState(2);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [claimingOfferId, setClaimingOfferId] = useState<number | null>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const promoCarouselRef = useRef<HTMLDivElement>(null);
  const promoCardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let disposed = false;
    let streamCountReceived = false;
    let streamErrorReported = false;
    const eventSource = new EventSource(`${API_BASE}/users/count/events/`);

    const handleUserCount = (event: Event) => {
      if (!(event instanceof MessageEvent)) {
        console.error("The user count stream returned an invalid event.");
        return;
      }

      try {
        const payload: unknown = JSON.parse(event.data);
        const count = readTrustedUserCount(payload);
        streamCountReceived = true;
        setTrustedUserCount(count);
      } catch (error) {
        console.error("The user count stream returned invalid data.", error);
      }
    };

    eventSource.addEventListener("trusted_user_count", handleUserCount);
    eventSource.onopen = () => {
      streamErrorReported = false;
    };
    eventSource.onerror = () => {
      if (!streamErrorReported) {
        console.error("The live trusted-user count connection was interrupted; the browser will retry.");
        streamErrorReported = true;
      }
    };

    fetch(`${API_BASE}/users/count/`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Loading the trusted-user count failed (${response.status}).`);
        }
        return response.json();
      })
      .then((payload: unknown) => {
        if (!disposed && !streamCountReceived) {
          setTrustedUserCount(readTrustedUserCount(payload));
        }
      })
      .catch((error: unknown) => {
        if (!disposed) console.error("Failed to load the trusted-user count.", error);
      });

    return () => {
      disposed = true;
      eventSource.close();
    };
  }, []);

  // Fetch services using Redux
  const { data: servicesData, isLoading: loading, error: servicesError } = useGetServicesQuery();

  useEffect(() => {
    const updateColumns = () => {
      setServiceColumns(window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const carouselSlideCount = !hasActiveFilters ? carouselItems.length : 0;

  useEffect(() => {
    if (carouselSlideCount === 0) return;
    const timer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % carouselSlideCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [carouselSlideCount]);

  useEffect(() => {
    const carousel = promoCarouselRef.current;
    const card = promoCardRefs.current[activePromo];
    if (!carousel || !card || carousel.clientWidth === 0) return;

    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left = carousel.scrollLeft + cardRect.left - carouselRect.left;

    carousel.scrollTo({ left, behavior: "smooth" });
  }, [activePromo, hasActiveFilters]);

  useEffect(() => {
    let isMounted = true;

    async function fetchCarouselItems() {
      try {
        const [offerResponse, bannerResponse] = await Promise.all([
          client.get("/offers"),
          client.get("/offers/banners"),
        ]);
        const offerItems: unknown = offerResponse;
        const bannerItems: unknown = bannerResponse;
        const items = Array.isArray(offerItems)
          ? offerItems
          : offerItems && typeof offerItems === "object" && "results" in offerItems && Array.isArray(offerItems.results)
            ? offerItems.results
            : [];
        const banners = Array.isArray(bannerItems)
          ? bannerItems
          : bannerItems && typeof bannerItems === "object" && "results" in bannerItems && Array.isArray(bannerItems.results)
            ? bannerItems.results
            : [];
        const now = Date.now();
        const currentOffers = items.filter(isOffer).filter((offer) => {
          const startsAt = offer.valid_from ? new Date(offer.valid_from).getTime() : 0;
          const endsAt = offer.valid_until ? new Date(offer.valid_until).getTime() : Infinity;
          return offer.is_active && startsAt <= now && endsAt >= now;
        }).map((offer): Offer => ({
          ...offer,
          discount_amount: Number(offer.discount_amount),
        }));

        const currentBanners = (banners as Banner[])
          .filter((banner) => {
            if (!banner.is_active || !banner.image_url) return false;
            const startsAt = banner.valid_from ? new Date(banner.valid_from).getTime() : 0;
            const endsAt = banner.valid_until ? new Date(banner.valid_until).getTime() : Infinity;
            return startsAt <= now && endsAt >= now;
          })
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const mixedItems: CarouselItem[] = [
          ...currentBanners.map((banner): CarouselItem => ({ kind: "banner", data: banner })),
          ...currentOffers.slice(0, 3).map((offer): CarouselItem => ({ kind: "offer", data: offer })),
        ];

        if (isMounted) {
          setOffers(currentOffers.slice(0, 3));
          setCarouselItems(mixedItems);
        }
      } catch (error) {
        console.error("Error fetching homepage carousel:", error);
      }
    }

    fetchCarouselItems();
    return () => {
      isMounted = false;
    };
  }, []);

  async function claimOfferFromHome(id: number) {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/offers?claim_offer=${id}`)}`);
      return;
    }

    setClaimingOfferId(id);
    try {
      await client.post(`/offers/${id}/claim`);
      setOffers((current) =>
        current.map((offer) =>
          offer.id === id ? { ...offer, is_claimed: true } : offer
        )
      );
      setCarouselItems((current) =>
        current.map((item) =>
          item.kind === "offer" && item.data.id === id
            ? { ...item, data: { ...item.data, is_claimed: true } }
            : item
        )
      );
    } catch (error) {
      console.error("Unable to claim offer:", error);
    } finally {
      setClaimingOfferId(null);
    }
  }

  // Transform services with images and icons (safely handle undefined/null data)
  const services: ServiceWithUI[] = (Array.isArray(servicesData) ? servicesData : []).map((s): ServiceWithUI => ({
    ...s,
    icon: getIconForCategory(s.category || "other"),
    image_url: s.image_url || (getImageForService(s.name) ? `/images/${getImageForService(s.name)}` : null),
  }));

  // Initial load bounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const categories = document.getElementById("categories-container");
      categories?.classList.add("animate-bounce-custom");
      setTimeout(() => categories?.classList.remove("animate-bounce-custom"), 600);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Horizontal scroll with mouse wheel on categories
  useEffect(() => {
    const scrollContainer = categoriesScrollRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Only intercept wheel events for horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // User is already trying horizontal scroll, let it happen naturally
        return;
      }
      
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY > 0 ? 50 : -50;
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, []);

  const handleAddToCart = (service: ServiceWithUI) => {
    if (isLoading) return;

    const { icon, ...cartService } = service as any;
    const finalCartService = { ...cartService, price: String(cartService.price), description: cartService.description || "" };
    dispatch(addToCart(finalCartService));
    queueCartAddEvent(createCartAddEvent(service.id, isAuthenticated ? user?.id : undefined));
    if (isAuthenticated && user?.id !== undefined) {
      void flushPendingCartAddEvents(user.id);
    }
    void trackMetaEvent("AddToCart", getServiceMetaData(service));

    if (!isAuthenticated) {
      router.push(`/signup?redirect=${encodeURIComponent("/cart")}`);
      return;
    }

    setAddedItem(service.id);
    setTimeout(() => setAddedItem(null), 800);
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const searchSuggestions = searchTerm.trim()
    ? services
        .filter((service) => {
          const query = searchTerm.trim().toLowerCase();
          return (
            service.name.toLowerCase().includes(query) ||
            service.category?.toLowerCase().includes(query) ||
            service.description?.toLowerCase().includes(query)
          );
        })
        .slice(0, 5)
    : [];

  const categories = ["laundry", "duvet-cleaning", "carpet-cleaning", "house-cleaning", "fumigation", "sofa-cleaning", "moving-services", "storage-services", "tv-mounting-hot-shower-installation", "subscriptions", "repairs"];
  const categoryLabels: Record<string, string> = {
    laundry: "Laundry",
    "duvet-cleaning": "Duvet",
    "carpet-cleaning": "Carpet",
    "house-cleaning": "House",
    fumigation: "Fumigation",
    "sofa-cleaning": "Sofa",
    "moving-services": "Moving",
    "storage-services": "Storage",
    "tv-mounting-hot-shower-installation": "Installation",
    subscriptions: "Subscriptions",
    repairs: "Repairs",
  };

  const renderServiceCard = (service: ServiceWithUI) => (
    <div
      key={service.id}
      className="block"
    >
      <Link href={`/services/${service.id}`} className="group block h-full">
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-red-600/5 hover:border-red-600/20 dark:hover:border-red-600/20 transition-all duration-300 h-[360px] flex flex-col cursor-pointer transform hover:-translate-y-1">
          <div className="relative min-h-0 flex-[3] bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-950 flex items-center justify-center border-b border-slate-200 dark:border-slate-800 rounded-t-2xl overflow-hidden">
            {service.image_url ? (
              <StableImage
                src={service.image_url}
                alt={service.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="flex flex-col items-center">
                {service.icon ? (
                  <service.icon className="w-14 h-14 text-slate-400 dark:text-slate-600 mb-2 group-hover:text-red-500 transition-colors" />
                ) : (
                  <SparklesIcon className="w-14 h-14 text-slate-400 dark:text-slate-600 mb-2 group-hover:text-red-500 transition-colors" />
                )}
                <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                  {categoryLabels[service.category || ""] || service.category}
                </span>
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 px-3 py-2 flex flex-col">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {service.name}
            </h3>
            {service.description && (
              <p className="line-clamp-1 text-xs text-slate-600 dark:text-slate-500">
                {service.description}
              </p>
            )}
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                KSh {Number(service.price).toLocaleString()}
              </div>
              <button
                aria-label={`Add ${service.name} to cart`}
                disabled={isLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleAddToCart(service);
                }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-medium transition-all transform active:scale-95 ${
                  addedItem === service.id
                    ? "bg-green-500 text-white"
                    : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
                }`}
              >
                {addedItem === service.id ? (
                  <CheckBadgeIcon className="h-4 w-4" />
                ) : (
                  <span aria-hidden="true" className="text-xl leading-none">+</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );

  const promoAndOffers = (
    <>
      {carouselSlideCount > 0 && (
      <section aria-label="Wild Wash promotions" className="col-span-full mb-2">
        <div
          ref={promoCarouselRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto"
          aria-roledescription="carousel"
        >
          {!hasActiveFilters && carouselItems.map((item, offerIndex) => {
            const index = offerIndex;
            if (item.kind === "banner") {
              const banner = item.data;
              const external = /^https?:\/\//i.test(banner.link_url);
              return (
                <article
                  key={`banner-${banner.id}`}
                  ref={(element) => { promoCardRefs.current[index] = element; }}
                  className="relative h-[168px] w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-md dark:border-slate-800 sm:h-[220px] md:w-[calc(50%_-_0.375rem)]"
                  aria-label={`${index + 1} of ${carouselSlideCount}`}
                >
                  <Image
                    src={banner.image_url}
                    alt=""
                    aria-hidden="true"
                    width={1200}
                    height={630}
                    unoptimized
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col items-start justify-end gap-2 p-3 sm:p-4">
                    <p className="line-clamp-2 text-sm font-extrabold leading-tight text-white sm:text-lg">{banner.title}</p>
                    <Link
                      href={banner.link_url}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-rose-50 sm:text-sm"
                    >
                      {banner.button_text || "View offer"}
                    </Link>
                  </div>
                </article>
              );
            }
            const offer = item.data;
            return (
              <OfferCard
                key={`offer-${offer.id}`}
                cardRef={(element) => {
                  promoCardRefs.current[index] = element;
                }}
                offer={offer}
                isClaimed={Boolean(offer.is_claimed)}
                onClaim={() => claimOfferFromHome(offer.id)}
                claiming={claimingOfferId === offer.id}
                className="w-full shrink-0 snap-start md:w-[calc(50%_-_0.375rem)]"
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2" aria-label="Promotion slides">
          <button
            type="button"
            onClick={() => setActivePromo((activePromo + carouselSlideCount - 1) % carouselSlideCount)}
            aria-label="Previous promotion"
            className="rounded-full border border-slate-300 p-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {Array.from({ length: carouselSlideCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActivePromo(index)}
              aria-label={`Show slide ${index + 1}`}
              aria-current={activePromo === index}
              className={`h-1.5 rounded-full transition-all ${activePromo === index ? "w-6 bg-red-600" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`}
            />
          ))}
          <button
            type="button"
            onClick={() => setActivePromo((activePromo + 1) % carouselSlideCount)}
            aria-label="Next promotion"
            className="rounded-full border border-slate-300 p-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </section>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-50">
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-custom {
          animation: bounce 0.6s ease-in-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-110 focus:outline-none"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Search bar - Sticky with blur */}
        <div className="sticky top-0 z-50 flex flex-col gap-2 bg-white/80 dark:bg-black/80 backdrop-blur-md py-2 mb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mb-6 md:flex-row md:items-center md:gap-3 md:py-3">
          <div className="relative w-full max-w-md shrink-0">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search services"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSearchSuggestions(false), 150)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setShowSearchSuggestions(false);
                if (event.key === "Enter" && searchSuggestions[0]) {
                  setShowSearchSuggestions(false);
                  void trackMetaEvent("Search", { search_string: searchTerm.trim() });
                  router.push(`/services/${searchSuggestions[0].id}`);
                }
              }}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSearchSuggestions && searchTerm.trim().length > 0}
              aria-controls="service-search-suggestions"
              className="w-full pl-12 pr-4 py-3 text-base border border-slate-200 dark:border-slate-800 rounded-full bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent transition-all duration-300 hover:shadow-md"
            />
            {showSearchSuggestions && searchTerm.trim().length > 0 && (
              <div
                id="service-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
              >
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setShowSearchSuggestions(false);
                        void trackMetaEvent("Search", { search_string: searchTerm.trim() });
                        router.push(`/services/${service.id}`);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {service.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs capitalize text-slate-500 dark:text-slate-400">
                          {service.category?.replaceAll("-", " ") || "Service"}
                        </span>
                      </span>
                      <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    No matching services found.
                  </p>
                )}
              </div>
            )}
          </div>
          <div id="categories-container" className="min-w-0 flex-1">
            <div ref={categoriesScrollRef} className="scrollbar-hide flex max-w-full items-center gap-2 overflow-x-auto py-1 md:justify-start">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap transform active:scale-95 ${
                  selectedCategory === null
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:scale-105"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap transform active:scale-95 ${
                    selectedCategory === cat
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:scale-105"
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
          </div>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-3 md:mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {selectedCategory ? categoryLabels[selectedCategory] : "All Services"}
            <span className="text-slate-500 dark:text-slate-400 font-normal ml-2 text-base">
              {filteredServices.length}
            </span>
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        <p className="mb-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300 md:mb-6">
          Trusted by{" "}
          <span aria-live="polite">
            {trustedUserCount === null
              ? "…"
              : `${(trustedUserCount + TRUSTED_USER_OFFSET).toLocaleString("en-US")}+`}
          </span>{" "}
          users
        </p>

        {/* Services grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-100 dark:bg-slate-900 rounded-2xl h-64 animate-pulse"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No services found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm ? "Try a different search term." : "Check back soon."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {filteredServices
                .slice(0, hasActiveFilters ? filteredServices.length : serviceColumns)
                .map(renderServiceCard)}
              {!hasActiveFilters && promoAndOffers}
            </div>
            {!hasActiveFilters && filteredServices.length > serviceColumns && (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
                {filteredServices.slice(serviceColumns).map(renderServiceCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}