"use client";

import React, { useState } from "react";
import { ChevronDownIcon, BellIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components";
import { useAppDispatch } from "@/redux/hooks";
import { addToCart } from "@/redux/features/cartSlice";
import { useGetServicesQuery } from "@/redux/services/apiSlice";
import type { Service } from "@/redux/services/apiSlice";
import { getServiceMetaData, trackMetaEvent } from "@/lib/metaConversions";
import StableImage from "@/components/StableImage";

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
  if (nameLower.includes("wash") || nameLower.includes("laundry")) {
    return "Standard Wash.png";
  }
  
  return "Standard Wash.png";
}

export default function ServicesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [notif, setNotif] = useState({ push: true, sms: false, email: false });
  const [sent, setSent] = useState<string | null>(null);
  const [addedServiceId, setAddedServiceId] = useState<number | null>(null);
  const dispatch = useAppDispatch();

  // Fetch services using Redux
  const { data: servicesData = [], isLoading: loading, error: servicesError } = useGetServicesQuery();

  // Transform services with images
  const services = servicesData.map((s) => ({
    ...s,
    image_url: s.image_url || (getImageForService(s.name) ? `/images/${getImageForService(s.name)}` : null),
  }));

  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  function simulateNotify() {
    setSent(null);
    setTimeout(() => {
      setSent(
        `Rider notified via: ${Object.entries(notif)
          .filter(([, v]) => v)
          .map(([k]) => k.toUpperCase())
          .join(", ") || "none"}`
      );
    }, 700);
  }

  function handleAddToCart(service: Service) {
    dispatch(
      addToCart({
        id: service.id,
        name: service.name,
        price: String(service.price),
        category: service.category || "other",
        description: service.description || "",
        processing_time: service.processing_time,
      })
    );
    void trackMetaEvent("AddToCart", getServiceMetaData(service));
    setAddedServiceId(service.id);
    window.setTimeout(() => setAddedServiceId(null), 800);
  }

  const grouped = groupByCategory(services);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold">Services — What we offer</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Choose a service category to see available packages and pricing. Tap a package to expand details and request it from the booking flow.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="w-8 h-8" />
          </div>
        ) : servicesError ? (
          <div className="text-center text-red-600">Error: {typeof servicesError === 'string' ? servicesError : 'Failed to load services'}</div>
        ) : services.length === 0 ? (
          <div className="text-center text-slate-500">No services available yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(grouped).map(([category, list]) => (
              <section key={category} className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
                <h2 className="text-xl font-semibold capitalize">
                  {categoryLabel(category)}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{getBlurb(category)}</p>

                <div className="mt-4 space-y-3">
                  {list.map((s) => (
                    <article key={s.id} className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                      <button
                        aria-expanded={open === s.id.toString()}
                        onClick={() => toggle(s.id.toString())}
                        className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 focus:outline-none"
                      >
                        {/* Service image */}
                        {s.image_url && (
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                            <StableImage
                              src={s.image_url}
                              alt={s.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-sm text-slate-500 mt-1">KSh {s.price}</div>
                        </div>
                        <ChevronDownIcon
                          className={`w-5 h-5 transition-transform flex-shrink-0 ${
                            open === s.id.toString() ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      <div
                        className={`${
                          open === s.id.toString() ? "max-h-96 p-4" : "max-h-0 p-0"
                        } transition-[max-height,padding] duration-300 overflow-hidden bg-white/50 dark:bg-white/3`}
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                          {s.description}
                        </p>
                        <div className="text-sm text-slate-600">
                          ETA: <span className="font-semibold">{getETA(s.category)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(s)}
                          className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors ${
                            addedServiceId === s.id
                              ? "bg-green-600"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {addedServiceId === s.id ? "Added to cart" : "Request"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Rider notification section */}
        <section className="mt-8 rounded-2xl bg-white/90 dark:bg-white/5 p-6 shadow">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-red-600" /> Rider notifications & outputs
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            When a pickup or delivery is requested, Wild Wash generates the following outputs and then notifies the rider.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Outputs</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                <li>Order receipt (PDF)</li>
                <li>Tracking code</li>
                <li>ETA & status updates</li>
              </ul>
            </div>

            <div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* --- Helpers --- */
function groupByCategory(services: Service[]) {
  return services.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, Service[]>);
}

function categoryLabel(key: string) {
  switch (key) {
    case "laundry":
      return "Laundry";
    case "duvet":
      return "Duvet Cleaning";
    case "carpet":
      return "Carpet Cleaning";
    case "house":
      return "House Cleaning";
    case "fumigation":
      return "Fumigation";
    case "installation":
      return "TV Mounting & Hot Shower Installation";
    default:
      return key;
  }
}

function getBlurb(key: string) {
  switch (key) {
    case "laundry":
      return "Wash, dry, fold, and special-care options for everyday clothes.";
    case "duvet":
      return "Cleaning for duvets, blankets, and bedding.";
    case "carpet":
      return "Spot or full carpet cleaning with steam options.";
    case "house":
      return "Standard and deep cleaning for homes.";
    case "fumigation":
      return "Certified pest control and sanitisation.";
    case "installation":
      return "Mounting and installation services.";
    default:
      return "";
  }
}

function getETA(key: string) {
  switch (key) {
    case "laundry":
      return "24–48h";
    case "duvet":
      return "48–72h";
    case "carpet":
      return "24–48h";
    case "house":
      return "2–4 hrs";
    case "fumigation":
      return "Same-day";
    case "installation":
      return "Same-day / next-day";
    default:
      return "Varies";
  }
}
