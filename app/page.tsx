'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Offer = {
  id: number;
  title: string;
  description: string;
  discount_percent: number;
  discount_amount: number;
  is_active: boolean;
  valid_from?: string;
  valid_until: string | null;
};

const isOffer = (
  value: unknown,
): value is Omit<Offer, "discount_amount"> & { discount_amount: number | string } => {
  if (!value || typeof value !== "object") return false;
  const offer = value as Record<string, unknown>;
  return (
    typeof offer.id === "number" &&
    typeof offer.title === "string" &&
    typeof offer.description === "string" &&
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

const promoSlides = [
  {
    eyebrow: "Wild Wash on Android",
    title: "Get the Wild Wash app.",
    description: "Book laundry and home-care services wherever you are.",
    action: "Download on Google Play",
    href: "https://play.google.com/store/apps/details?id=com.kibeezy.ww&pli=1",
    external: true,
    style: "from-red-800 via-red-700 to-orange-600",
  },
  {
    eyebrow: "Wild Wash, made easy",
    title: "More time for what matters.",
    description: "Book laundry and home-care services from one simple place.",
    action: "Explore services",
    href: "/services",
    style: "from-red-700 via-rose-600 to-orange-500",
  },
  {
    eyebrow: "Fresh deals, real savings",
    title: "Find your next great offer.",
    description: "See current offers and claim the ones that work for you.",
    action: "View offers",
    href: "/offers",
    style: "from-slate-950 via-slate-800 to-red-900",
  },
  {
    eyebrow: "Care for your home",
    title: "Laundry is just the beginning.",
    description: "Explore cleaning, fumigation, repairs and more.",
    action: "Browse all services",
    href: "/services",
    style: "from-emerald-800 via-teal-700 to-cyan-700",
  },
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [activePromo, setActivePromo] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const promoCarouselRef = useRef<HTMLDivElement>(null);
  const promoCardRefs = useRef<(HTMLElement | null)[]>([]);

  // Fetch services using Redux
  const { data: servicesData, isLoading: loading, error: servicesError } = useGetServicesQuery();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % promoSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const carousel = promoCarouselRef.current;
    const card = promoCardRefs.current[activePromo];
    if (!carousel || !card || carousel.clientWidth === 0) return;

    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left =
      carousel.scrollLeft +
      cardRect.left -
      carouselRect.left -
      (carousel.clientWidth - card.clientWidth) / 2;

    carousel.scrollTo({ left, behavior: "smooth" });
  }, [activePromo]);

  useEffect(() => {
    let isMounted = true;

    async function fetchOffers() {
      try {
        const response: unknown = await client.get("/offers");
        const items = Array.isArray(response)
          ? response
          : response && typeof response === "object" && "results" in response && Array.isArray(response.results)
            ? response.results
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

        if (isMounted) setOffers(currentOffers.slice(0, 3));
      } catch (error) {
        console.error("Error fetching homepage offers:", error);
        if (isMounted) {
          setOffersError(error instanceof Error ? error.message : "Unable to load current offers.");
        }
      } finally {
        if (isMounted) setOffersLoading(false);
      }
    }

    fetchOffers();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Setup IntersectionObserver for card animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = Number(entry.target.getAttribute("data-id"));
        if (entry.isIntersecting) {
          setVisibleCards((prev) => new Set(prev).add(id));
        } else {
          setVisibleCards((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    return () => observerRef.current?.disconnect();
  }, []);

  // Observe/unobserve cards when services change
  useEffect(() => {
    cardRefs.current.forEach((ref, id) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });
    return () => {
      observerRef.current?.disconnect();
    };
  }, [services]);

  const handleAddToCart = (service: ServiceWithUI) => {
    const { icon, ...cartService } = service as any;
    const finalCartService = { ...cartService, price: String(cartService.price), description: cartService.description || "" };
    dispatch(addToCart(finalCartService));
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
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-enter {
          animation: fade-up 0.5s ease-out forwards;
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
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md py-4 mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="relative w-full max-w-md mx-auto">
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
        </div>

        <section aria-label="Discover Wild Wash" className="mb-8">
          <div className="hidden md:block">
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${promoSlides[activePromo].style} px-8 py-9 text-white shadow-lg md:px-12 md:py-11`}>
              <div className="max-w-2xl">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  {promoSlides[activePromo].eyebrow}
                </p>
                <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                  {promoSlides[activePromo].title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 md:text-base">
                  {promoSlides[activePromo].description}
                </p>
                {promoSlides[activePromo].external ? (
                  <a
                    href={promoSlides[activePromo].href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {promoSlides[activePromo].action}
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    href={promoSlides[activePromo].href}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {promoSlides[activePromo].action}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <div className="absolute bottom-6 right-8 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePromo((activePromo + promoSlides.length - 1) % promoSlides.length)}
                  aria-label="Previous promotion"
                  className="rounded-full border border-white/40 p-2 text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePromo((activePromo + 1) % promoSlides.length)}
                  aria-label="Next promotion"
                  className="rounded-full border border-white/40 p-2 text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <span className="ml-1 text-xs font-medium text-white/80">
                  {activePromo + 1} / {promoSlides.length}
                </span>
              </div>
            </div>
          </div>

          <div ref={promoCarouselRef} className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
            {promoSlides.map((slide, index) => (
              <article
                key={slide.title}
                ref={(element) => {
                  promoCardRefs.current[index] = element;
                }}
                className={`w-[86%] max-w-sm shrink-0 snap-center rounded-2xl bg-gradient-to-br ${slide.style} p-5 text-white shadow-md`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                  {slide.eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-bold leading-tight">{slide.title}</h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-white/85">{slide.description}</p>
                {slide.external ? (
                  <a
                    href={slide.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {slide.action}
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    href={slide.href}
                    className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {slide.action}
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                )}
              </article>
            ))}
          </div>

          <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-label="Promotion slides">
            {promoSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActivePromo(index)}
                aria-label={`Show promotion ${index + 1}`}
                aria-current={activePromo === index}
                className={`h-1.5 rounded-full transition-all ${activePromo === index ? "w-6 bg-red-600" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="homepage-offers-title" className="mb-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Save on your next order</p>
              <h2 id="homepage-offers-title" className="mt-1 text-lg font-bold">Current offers</h2>
            </div>
            <Link href="/offers" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
              All offers <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          {offersLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading offers">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
              ))}
            </div>
          ) : offersError ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              Current offers couldn’t be loaded. <Link href="/offers" className="font-semibold underline">View offers</Link>
            </p>
          ) : offers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <Link
                  key={offer.id}
                  href="/offers"
                  className="group rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-red-950 dark:from-red-950/40 dark:to-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{offer.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{offer.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                      {offer.discount_percent > 0 ? `${offer.discount_percent}% OFF` : `KSh ${offer.discount_amount} OFF`}
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 group-hover:gap-2">
                    See offer <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No current offers right now. Check back soon or <Link href="/offers" className="font-semibold text-red-600">browse all offers</Link>.
            </div>
          )}
        </section>

        <section aria-label="What you can do with Wild Wash" className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:gap-4 sm:p-4">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <span className="rounded-xl bg-white p-2 text-red-600 shadow-sm dark:bg-slate-950"><TruckIcon className="h-5 w-5" /></span>
            <span className="text-[11px] font-semibold leading-tight sm:text-sm">Book services online</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <span className="rounded-xl bg-white p-2 text-red-600 shadow-sm dark:bg-slate-950"><TagIcon className="h-5 w-5" /></span>
            <span className="text-[11px] font-semibold leading-tight sm:text-sm">Discover live offers</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <span className="rounded-xl bg-white p-2 text-red-600 shadow-sm dark:bg-slate-950"><CreditCardIcon className="h-5 w-5" /></span>
            <span className="text-[11px] font-semibold leading-tight sm:text-sm">Simple online checkout</span>
          </div>
        </section>

        {/* Categories - Sticky with blur */}
        <div
          id="categories-container"
          className="sticky top-16 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md py-3 mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 flex justify-center"
        >
          <div ref={categoriesScrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 max-w-4xl">
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

        {/* Results header */}
        <div className="flex items-center justify-between mb-8">
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

        <p className="mb-6 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
          Trusted by 597903+ users
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(service.id, el);
                  else cardRefs.current.delete(service.id);
                }}
                data-id={service.id}
                className={`${visibleCards.has(service.id) ? "card-enter" : "opacity-0"}`}
                style={{ animationDelay: `${(service.id % 10) * 0.05}s` }}
              >
                <Link
                  href={`/services/${service.id}`}
                  className="group block h-full"
                >
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-red-600/5 hover:border-red-600/20 dark:hover:border-red-600/20 transition-all duration-300 h-full flex flex-col cursor-pointer transform hover:-translate-y-1">
                    {/* Image/Icon area */}
                    <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-950 flex items-center justify-center border-b border-slate-200 dark:border-slate-800 rounded-t-2xl overflow-hidden">
                      {service.image_url ? (
                        <img
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

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-500 mb-3 line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      <div className="flex items-baseline justify-between mb-3 mt-auto">
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          KSh {Number(service.price).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(service);
                        }}
                        className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all transform active:scale-95 ${
                          addedItem === service.id
                            ? "bg-green-500 text-white"
                            : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
                        }`}
                      >
                        {addedItem === service.id ? (
                          <span className="flex items-center justify-center gap-1">
                            <CheckBadgeIcon className="w-4 h-4" /> Added
                          </span>
                        ) : (
                          "Add to cart"
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}