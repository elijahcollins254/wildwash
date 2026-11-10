'use client';

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  SparklesIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch } from "@/redux/hooks";
import { addToCart } from "@/redux/features/cartSlice";
import { useGetServiceDetailQuery, useGetServicesQuery } from "@/redux/services/apiSlice";
import type { Service } from "@/redux/services/apiSlice";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const serviceId = Number(params.id);

  const [addedToCart, setAddedToCart] = useState(false);
  const [addedRelatedId, setAddedRelatedId] = useState<number | null>(null);
  const [pauseRelatedAutoscroll, setPauseRelatedAutoscroll] = useState(false);
  const relatedCarouselRef = useRef<HTMLDivElement>(null);

  // Fetch service using Redux
  const { data: service, isLoading: loading, error: serviceError } = useGetServiceDetailQuery(serviceId);
  const { data: services = [] } = useGetServicesQuery();

  // Transform service with image
  const displayService = service ? {
    ...service,
    image_url: service.image_url || (getImageForService(service.name) ? `/images/${getImageForService(service.name)}` : null),
  } : null;

  const otherServices = services.filter((item) => item.id !== serviceId);
  const sameCategoryServices = displayService
    ? otherServices.filter((item) => item.category === displayService.category)
    : [];
  const relatedServices = (sameCategoryServices.length > 0 ? sameCategoryServices : otherServices)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      image_url: item.image_url || `/images/${getImageForService(item.name)}`,
    }));

  useEffect(() => {
    const carousel = relatedCarouselRef.current;
    if (!carousel || relatedServices.length === 0 || pauseRelatedAutoscroll) return;

    const interval = window.setInterval(() => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const firstCard = carousel.firstElementChild;
      const secondCard = firstCard?.nextElementSibling;
      if (!(firstCard instanceof HTMLElement) || !(secondCard instanceof HTMLElement)) return;

      const step = isDesktop
        ? secondCard.offsetTop - firstCard.offsetTop
        : secondCard.offsetLeft - firstCard.offsetLeft;
      const currentPosition = isDesktop ? carousel.scrollTop : carousel.scrollLeft;
      const loopBoundary = isDesktop ? carousel.scrollHeight / 2 : carousel.scrollWidth / 2;

      if (currentPosition + step >= loopBoundary) {
        if (isDesktop) carousel.scrollTop = 0;
        else carousel.scrollLeft = 0;
      } else {
        carousel.scrollBy({
          left: isDesktop ? 0 : step,
          top: isDesktop ? step : 0,
          behavior: "smooth",
        });
      }
    }, 3200);

    return () => window.clearInterval(interval);
  }, [relatedServices.length, pauseRelatedAutoscroll]);

  const handleAddToCart = () => {
    if (!displayService) return;
    
    dispatch(
      addToCart({
        id: displayService.id,
        name: displayService.name,
        price: String(displayService.price),
        category: displayService.category || "other",
        description: displayService.description || "",
      })
    );
    
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 800);
  };

  const handleAddRelatedToCart = (relatedService: Service) => {
    dispatch(
      addToCart({
        id: relatedService.id,
        name: relatedService.name,
        price: String(relatedService.price),
        category: relatedService.category || "other",
        description: relatedService.description || "",
      })
    );

    setAddedRelatedId(relatedService.id);
    setTimeout(() => setAddedRelatedId(null), 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-50">
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-24">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
          <div className="space-y-4">
            <div className="h-[500px] bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-6 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse w-3/4" />
            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (serviceError || !displayService) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-50">
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-24">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
          <div className="text-center py-20">
            <h2 className="text-2xl font-600 text-slate-900 dark:text-slate-100 mb-3">
              Service not found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {typeof serviceError === 'string' ? serviceError : "The service you're looking for doesn't exist."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-red-600 text-white px-6 py-2 rounded-full font-500 hover:bg-red-700 transition-colors"
            >
              Return to Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-50">
      <div className="max-w-7xl mx-auto px-5 pt-6 pb-24">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div className="min-w-0">
            {/* Service image/icon */}
            <div className="w-full h-[500px] bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-950 rounded-2xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-800 overflow-hidden">
              {displayService?.image_url ? (
                <img
                  src={displayService.image_url}
                  alt={displayService.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <SparklesIcon className="w-24 h-24 text-slate-400 dark:text-slate-600 mb-3" />
                  <span className="text-slate-500 dark:text-slate-500 text-sm font-500">
                    {displayService?.category || "Service"}
                  </span>
                </div>
              )}
            </div>

            {/* Service details */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-700 text-slate-900 dark:text-slate-50 mb-2">
                    {displayService?.name}
                  </h1>
                  {displayService?.category && (
                    <span className="inline-block px-3 py-1 text-xs font-500 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      {displayService.category}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-700 text-red-600 dark:text-red-500 whitespace-nowrap">
                  KSh {Number(displayService?.price || 0).toLocaleString()}
                </div>
              </div>

              {displayService?.description && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {displayService.description}
                  </p>
                </div>
              )}
            </div>

            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 px-6 rounded-full font-600 text-base transition-all flex items-center justify-center gap-2 ${
                addedToCart
                  ? "bg-green-500 text-white"
                  : "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]"
              }`}
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {addedToCart ? "Added to cart" : "Add to cart"}
            </button>

            {/* Back to services link */}
            <button
              onClick={() => router.push("/")}
              className="w-full mt-3 py-3 px-6 rounded-full font-500 text-base text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-800"
            >
              Continue shopping
            </button>
          </div>

          {relatedServices.length > 0 && (
            <aside aria-labelledby="related-services-title" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              <div className="mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  More to explore
                </p>
                <h2 id="related-services-title" className="mt-1 text-xl font-bold">
                  Related services
                </h2>
              </div>
              </div>

              <div
                ref={relatedCarouselRef}
                onMouseEnter={() => setPauseRelatedAutoscroll(true)}
                onMouseLeave={() => setPauseRelatedAutoscroll(false)}
                onFocusCapture={() => setPauseRelatedAutoscroll(true)}
                onBlurCapture={() => setPauseRelatedAutoscroll(false)}
                onTouchStart={() => setPauseRelatedAutoscroll(true)}
                onTouchEnd={() => setPauseRelatedAutoscroll(false)}
                className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 lg:mx-0 lg:max-h-[calc(100vh-7rem)] lg:snap-y lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:px-0"
              >
              {[...relatedServices, ...relatedServices].map((relatedService, index) => (
                <article
                  key={`${relatedService.id}-${index}`}
                  className="w-[78%] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-1 hover:border-red-600/20 hover:shadow-xl hover:shadow-red-600/5 dark:border-slate-800 dark:bg-slate-900/50 lg:flex lg:w-full lg:max-w-none lg:items-start lg:gap-3 lg:rounded-xl lg:p-2 lg:hover:translate-y-0"
                >
                  <Link href={`/services/${relatedService.id}`} className="group block lg:flex lg:min-w-0 lg:flex-1 lg:items-center lg:gap-3">
                    <div className="h-40 overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-800 dark:from-slate-800 dark:to-slate-950 lg:h-24 lg:w-40 lg:shrink-0 lg:rounded-lg lg:border-0">
                      {relatedService.image_url ? (
                        <img
                          src={relatedService.image_url}
                          alt={relatedService.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <SparklesIcon className="h-14 w-14 text-slate-400 dark:text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 lg:min-w-0 lg:flex-1 lg:p-0">
                      <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {relatedService.name}
                      </h3>
                      {relatedService.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-500">
                          {relatedService.description}
                        </p>
                      )}
                      <p className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                        KSh {Number(relatedService.price).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                  <div className="px-4 pb-4 lg:w-28 lg:shrink-0 lg:px-0 lg:py-0">
                    <button
                      type="button"
                      onClick={() => handleAddRelatedToCart(relatedService)}
                      className={`w-full rounded-xl py-2.5 text-sm font-medium transition ${
                        addedRelatedId === relatedService.id
                          ? "bg-green-500 text-white"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {addedRelatedId === relatedService.id ? "Added to cart" : "Add to cart"}
                    </button>
                  </div>
                </article>
              ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
