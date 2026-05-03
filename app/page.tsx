'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
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
} from "@heroicons/react/24/outline";
import { useAppDispatch } from "@/redux/hooks";
import { addToCart } from "@/redux/features/cartSlice";
import { useGetServicesQuery } from "@/redux/services/apiSlice";
import type { Service } from "@/redux/services/apiSlice";
import type { RootState } from "@/redux/store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch services using Redux
  const { data: servicesData, isLoading: loading, error: servicesError } = useGetServicesQuery();

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
              className="w-full pl-12 pr-4 py-3 text-base border border-slate-200 dark:border-slate-800 rounded-full bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent transition-all duration-300 hover:shadow-md"
            />
          </div>
        </div>

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