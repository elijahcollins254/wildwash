"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type StatusPoint = {
  key: string;
  label: string;
  subtitle?: string;
  timestamp?: string;
  done?: boolean;
};

type Order = {
  id?: number;
  code: string;
  createdAt?: string;
  user?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  serviceName?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  items: number;
  weightKg?: number;
  package: string;
  price: string;
  priceDisplay?: string | null;
  status: string;
  eta?: string;
  deliveredAt?: string;
  rider?: { name: string; phone?: string };
  statusLog?: StatusPoint[];
  is_paid?: boolean;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    const [k, ...v] = c.split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

type OrderParams = {
  code: string;
};

// Helper function to extract phone number from address
function extractPhoneFromAddress(address?: string): { cleanAddress: string; phone: string | null } {
  if (!address) return { cleanAddress: address ?? "", phone: null };
  
  // Match phone number patterns like +254718693484 or (contact: +254718693484)
  const phoneMatch = address.match(/\(?contact:\s*(\+?[\d\s\-]+)\)?/i);
  
  if (phoneMatch && phoneMatch[1]) {
    const phone = phoneMatch[1].trim();
    const cleanAddress = address.replace(/\s*\(?contact:\s*[\d\s\-\(\)]+\)?\s*$/i, "").trim();
    return { cleanAddress, phone };
  }
  
  return { cleanAddress: address, phone: null };
}

export default function OrderDetailsPage() {
  const params = useParams<OrderParams>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

  const handleProceedToCheckout = async () => {
    setCheckoutLoading(true);
    try {
      // Fetch latest order data to ensure we use the current price
      let token = null;
      if (typeof window !== 'undefined') {
        const authState = localStorage.getItem('wildwash_auth_state');
        if (authState) {
          try {
            const parsed = JSON.parse(authState);
            token = parsed.token;
          } catch (e) {
            console.error('Error parsing auth state:', e);
          }
        }
      }

      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }

      // Use the list endpoint with code filter (same as fetchOrder)
      const response = await fetch(`${API_BASE}/orders?code=${encodeURIComponent(params.code)}`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle paginated or list response
      let latestOrder;
      if (data.results && Array.isArray(data.results)) {
        latestOrder = data.results[0];
      } else if (Array.isArray(data)) {
        latestOrder = data[0];
      } else {
        latestOrder = data;
      }

      if (!latestOrder) {
        throw new Error('Order not found');
      }

      const latestPrice = (latestOrder.price || latestOrder.actual_price || '0').toString().replace(/[^0-9.]/g, '');
      
      // Redirect to checkout with the latest price from the server
      router.push(`/checkout?order_id=${encodeURIComponent(latestOrder.code)}&amount=${encodeURIComponent(latestPrice)}`);
    } catch (err: any) {
      console.error('Error preparing checkout:', err);
      alert(`Error preparing checkout: ${err?.message || 'Unknown error'}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      setError(null);

      try {
        // Get auth token from wildwash_auth_state
        let token = null;
        if (typeof window !== 'undefined') {
          const authState = localStorage.getItem('wildwash_auth_state');
          if (authState) {
            try {
              const parsed = JSON.parse(authState);
              token = parsed.token;
            } catch (e) {
              console.error('Error parsing auth state:', e);
            }
          }
        }

        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) {
          headers["Authorization"] = `Token ${token}`;
        }

        const url = `${API_BASE}/orders?code=${encodeURIComponent(params.code)}`;
        const res = await fetch(url, {
          method: "GET",
          headers,
          credentials: 'same-origin',
        });

        if (!res.ok) {
          throw new Error(`Server error ${res.status}`);
        }

        const data = await res.json();
        
        // Handle paginated response format
        let found;
        if (data.results && Array.isArray(data.results)) {
          found = data.results[0];
        } else if (Array.isArray(data)) {
          found = data[0];
        } else {
          found = data;
        }

        if (!found) {
          throw new Error("Order not found");
        }

        // normalize
        const { cleanAddress: cleanPickup, phone: pickupPhone } = extractPhoneFromAddress(found.pickup_address);
        const { cleanAddress: cleanDropoff } = extractPhoneFromAddress(found.dropoff_address);
        
        const mapped: Order = {
          id: found.id,
          code: found.code || `WW-${found.id}`,
          createdAt: found.created_at ?? found.createdAt ?? undefined,
          user: found.user ?? undefined,
          userName: found.user?.first_name && found.user?.last_name 
            ? `${found.user.first_name} ${found.user.last_name}`
            : found.user?.username ?? undefined,
          userEmail: found.user?.email ?? undefined,
          userPhone: found.user?.phone ?? found.user?.phone_number ?? pickupPhone ?? undefined,
          serviceName: found.service_name ?? (found.service && typeof found.service === "object" ? found.service.name : undefined),
          pickupAddress: cleanPickup ?? undefined,
          dropoffAddress: cleanDropoff ?? undefined,
          items: found.items ?? 0,
          weightKg: found.weight_kg ? Number(found.weight_kg) : undefined,
          package: (() => {
            if (typeof found.package === "string" && found.package) return found.package;
            if (found.service_name) return found.service_name;
            if (found.service && typeof found.service === "object") return found.service.name ?? "Standard";
            return found.package ?? "Standard";
          })(),
          price: found.price_display ?? (found.total_price ? `KSh ${Number(found.total_price).toLocaleString()}` : (found.price ? `KSh ${Number(found.price).toLocaleString()}` : "")),
          priceDisplay: found.price_display ?? null,
          status: mapStatus(found.status ?? found.status_code ?? ""),
          eta: found.estimated_delivery ? new Date(found.estimated_delivery).toLocaleString() : undefined,
          deliveredAt: found.delivered_at ? new Date(found.delivered_at).toLocaleString() : undefined,
          rider: found.rider ? { name: found.rider.username || found.rider.first_name || found.rider.name, phone: found.rider.phone } : undefined,
          statusLog: found.timeline ?? found.status_log ?? [],
          is_paid: found.is_paid ?? false,
        };

        setOrder(mapped);
      } catch (err: any) {
        console.error("Error fetching order:", err);
        setError(err?.message ?? "Failed to load order details");
      } finally {
        setLoading(false);
      }
    }

    if (params.code) {
      fetchOrder();
    }
  }, [params.code, API_BASE]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/orders" className="text-sm text-red-600 hover:underline">← Back to orders</Link>
            <h1 className="mt-2 text-3xl font-extrabold">Order Details</h1>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow text-sm text-slate-600">Loading order details...</div>
        ) : error ? (
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            <div className="text-red-600 text-sm">{error}</div>
            <Link href="/orders" className="mt-4 inline-block text-sm text-red-600 hover:underline">Return to orders</Link>
          </div>
        ) : order ? (
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            {/* Order header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Order Code</div>
                <div className="font-mono font-semibold text-lg">{order.code}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {order.items} items · {order.weightKg ? `${order.weightKg} kg` : ""} · {order.package}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
                <div className="font-semibold text-red-600">{order.status}</div>
                {order.is_paid && (
                  <div className="mt-2 inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                    ✓ Paid
                  </div>
                )}
                {order.eta && (
                  <>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">ETA</div>
                    <div className="font-medium">{order.eta}</div>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-2 sm:h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    order.status.toLowerCase() === 'cancelled'
                      ? 'bg-gray-400'
                      : order.status.toLowerCase() === 'delivered'
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : 'bg-gradient-to-r from-red-400 to-red-600 animate-pulse'
                  }`}
                  style={{ 
                    width: `${calcProgress(order.status)}%`,
                    transitionProperty: 'width, background-color',
                  }}
                />
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {calcProgress(order.status)}% complete
                </div>
                <div className={`text-xs sm:text-sm font-medium ${
                  order.status.toLowerCase() === 'cancelled'
                    ? 'text-gray-500'
                    : order.status.toLowerCase() === 'delivered'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {order.status}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Order Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Created</div>
                    <div className="mt-1 font-medium">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Service</div>
                    <div className="mt-1 font-medium">{order.serviceName ?? order.package}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Price</div>
                    <div className="mt-1 font-medium">{order.price || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Payment Status</div>
                    <div className="mt-1 font-medium">
                      {order.is_paid ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm font-semibold">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm font-semibold">
                          Pending Payment
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Customer Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Customer Name</div>
                    <div className="mt-1 font-medium">{order.userName ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Phone</div>
                    <div className="mt-1 font-medium">
                      {order.userPhone ? (
                        <a href={`tel:${order.userPhone}`} className="text-red-600 hover:underline">
                          {order.userPhone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Pickup Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Pickup Address</div>
                    <div className="mt-1 font-medium">{order.pickupAddress ?? "—"}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Delivery Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Dropoff Address</div>
                    <div className="mt-1 font-medium">{order.dropoffAddress ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Rider</div>
                    <div className="mt-1 font-medium">
                      {order.rider ? (
                        <div className="flex items-center justify-between">
                          <span>{order.rider.name}</span>
                          {order.rider.phone && (
                            <a href={`tel:${order.rider.phone}`} className="text-red-600 hover:underline">
                              {order.rider.phone}
                            </a>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6">
              {!order.is_paid && (
                <button
                  onClick={handleProceedToCheckout}
                  disabled={checkoutLoading}
                  className="inline-block px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  {checkoutLoading ? "Preparing checkout..." : "Proceed to Checkout"}
                </button>
              )}
            </div>

            {/* Status timeline */}
            {order.statusLog && order.statusLog.length > 0 && (
              <div className="mt-8 border-t dark:border-slate-700 pt-8">
                <h3 className="font-semibold mb-4">Order Timeline</h3>
                <ol className="relative border-l border-slate-200 dark:border-slate-700 space-y-6">
                  {order.statusLog.map((s) => (
                    <li key={s.key} className="ml-4">
                      <div className="absolute w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 -left-1.5 border border-white dark:border-slate-800" />
                      <div className="flex items-baseline gap-2">
                        <div className="font-medium">{s.label}</div>
                        <time className="text-xs text-slate-500 dark:text-slate-400">{s.timestamp ?? "—"}</time>
                      </div>
                      {s.subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.subtitle}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function calcProgress(status?: string) {
  if (!status) return 0;
  
  // Progress mapping for each status
  const progressMap: Record<string, number> = {
    requested: 10,
    received: 10,
    picked: 30,
    washing: 50,
    in_progress: 60,
    drying: 70,
    ready: 90,
    delivered: 100,
    cancelled: 0
  };
  
  return progressMap[status.toLowerCase()] ?? 0;
}

function mapStatus(s: string): string {
  const map: Record<string, string> = {
    requested: "Received",
    picked: "Washing",
    in_progress: "Drying",
    washed: "Drying",
    ready: "Ready",
    delivered: "Delivered",
    cancelled: "Cancelled",
    pending_assignment: "Pending Rider Assignment",
  };
  return map[s] || s || "Received";
}