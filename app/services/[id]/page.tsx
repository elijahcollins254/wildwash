'use client';

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch } from "@/redux/hooks";
import { addToCart } from "@/redux/features/cartSlice";
import { useGetServiceDetailQuery } from "@/redux/services/apiSlice";
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
};

function getImageForService(serviceName: string): string {
  // First, try exact match
  if (serviceImageMap[serviceName]) {
    return serviceImageMap[serviceName];
  }

  // If no exact match, find closest match by keyword
  const nameLower = serviceName.toLowerCase();
  
  if (nameLower.includes("tv") || nameLower.includes("mounting")) {
    return "Tv Installation.png";
  }
  if (nameLower.includes("hotshower") || nameLower.includes("hot shower")) {
    return "Shower Installation.png";
  }
  if (nameLower.includes("fumigation") || nameLower.includes("bedsitter")) {
    return "Bedsitter Fumigation.png";
  }
  if (nameLower.includes("carpet")) {
    return "Carpet Cleaning.png";
  }
  if (nameLower.includes("duvet")) {
    return "Duvet Cleaning.png";
  }
  if (nameLower.includes("iron")) {
    return "Ironing Service.png";
  }
  if (nameLower.includes("dry") || nameLower.includes("dryclean")) {
    return "Dry Cleaning.png";
  }
  if (nameLower.includes("express")) {
    return "Express Wash.png";
  }
  if (nameLower.includes("wash") || nameLower.includes("laundry") || nameLower.includes("clean")) {
    return "Standard Wash.png";
  }
  
  return "Standard Wash.png";
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const serviceId = Number(params.id);

  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch service using Redux
  const { data: service, isLoading: loading, error: serviceError } = useGetServiceDetailQuery(serviceId);

  // Transform service with image
  const displayService = service ? {
    ...service,
    image_url: service.image_url || (getImageForService(service.name) ? `/images/${getImageForService(service.name)}` : null),
  } : null;

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
      <div className="max-w-2xl mx-auto px-5 pt-6 pb-24">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>

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

          {/* Features */}
          <div className="mb-6">
            <h2 className="text-base font-600 text-slate-900 dark:text-slate-100 mb-3">
              What's included
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Professional service
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Quality guaranteed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Fast delivery
                </span>
              </div>
            </div>
          </div>
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
    </div>
  );
}
