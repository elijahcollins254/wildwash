"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Package, Eye } from "lucide-react";
import Link from "next/link";
import RouteGuard from "@/components/RouteGuard";
import { useRiderOrderNotifications } from "@/lib/hooks/useRiderOrderNotifications";
import { useBackgroundOrderPolling } from "@/lib/hooks/useBackgroundOrderPolling";
import { useGetRiderProfilesQuery, useGetRiderLocationsQuery } from "@/redux/services/apiSlice";
import type { RiderProfile, RiderLocation } from "@/redux/services/apiSlice";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* --- Types --- */
type OrderStatus = 'requested' | 'picked' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

type Order = {
  id: number;
  code: string;
  service: {
    name: string;
    package: string;
  };
  pickup_address: string;
  dropoff_address: string;
  status: OrderStatus;
  urgency: number;
  items: number;
  weight_kg?: number | null;
  price?: number | null;
  created_at: string;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  user?: string;
  pickup_location?: { lat: number; lng: number };
  dropoff_location?: { lat: number; lng: number };
  service_location?: { id: number; name: string } | null;
  quantity?: number | null;
  description?: string | null;
};

type OrderDetails = {
  quantity?: number;
  weight_kg?: number;
  description?: string;
};

type OrderUpdatePayload = {
  status?: OrderStatus;
  quantity?: number;
  weight_kg?: number;
  description?: string;
};

/* --- Component --- */
export default function RiderMapPage(): React.ReactElement {
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('in_progress');

  // Fetch profiles and locations using Redux
  const { data: profiles = [], isLoading: loadingProfiles, error: errorProfiles, refetch: refetchProfiles } = useGetRiderProfilesQuery();
  const { data: locations = [], isLoading: loadingLocations, error: errorLocations, refetch: refetchLocations } = useGetRiderLocationsQuery();

  // Confirmation state for action buttons (orderId -> timestamp)
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Order details form state
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    quantity: undefined,
    weight_kg: undefined,
    description: '',
  });

  // Get the order notification hook
  const { decrementCount: decrementOrderCount, setAvailableOrdersCount: setOrdersCount, fetchAndUpdateOrdersCount } = useRiderOrderNotifications();

  // Get authentication token
  const authState = JSON.parse(
    typeof window !== 'undefined' ? localStorage.getItem('wildwash_auth_state') || '{}' : '{}'
  );
  const token = authState.token || null;

  // Use background polling for orders - smart updates without page reload
  const backgroundOrders = useBackgroundOrderPolling(token, true, 60000); // 60 second default interval
  const orders = backgroundOrders;

  // Update loading state when orders arrive
  useEffect(() => {
    if (backgroundOrders.length > 0 && loadingOrders) {
      setLoadingOrders(false);
    }
  }, [backgroundOrders, loadingOrders]);

  // Cleanup confirmation timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

 manual refresh needed - polling handles it intelligently

  useEffect(() => {
    // Initialize order notification count on page load
    fetchAndUpdateOrdersCount();
  }, []);

  // Sound notifications disabled - SMS Africa handles audio notifications instead
  // useRiderNotifications hook removed as it was creating duplicate notifications

  const handleOpenDetailsForm = (order: Order) => {
    setDetailsOrderId(order.id);
    // Do NOT pre-fill: require the rider to enter their own quantity/weight/notes
    setOrderDetails({
      quantity: undefined,
      weight_kg: undefined,
      description: '',
    });
  };

  const handleCloseDetailsForm = () => {
    setDetailsOrderId(null);
    setOrderDetails({
      quantity: undefined,
      weight_kg: undefined,
      description: '',
    });
  };

  const handleSaveOrderDetails = async () => {
    try {
      const authState = JSON.parse(localStorage.getItem('wildwash_auth_state') || '{}');
      const token = authState.token;
      if (!token) {
        throw new Error('Authentication required');
      }

      setProcessingOrderId(detailsOrderId);

      const payload: OrderUpdatePayload = {
        status: 'picked'
      };

      // Only include fields that have been filled
      if (orderDetails.quantity !== undefined && orderDetails.quantity > 0) {
        payload.quantity = orderDetails.quantity;
      }
      if (orderDetails.weight_kg !== undefined && orderDetails.weight_kg > 0) {
        payload.weight_kg = orderDetails.weight_kg;
      }
      if (orderDetails.description && orderDetails.description.trim()) {
        payload.description = orderDetails.description.trim();
      }

      const res = await fetch(`${API_BASE}/orders/update/?id=${detailsOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update order: ${res.status}`);
      }

      // Close form and let background polling refresh
      handleCloseDetailsForm();
      // Background polling will pick up the change
      setCurrentStatus('picked');
    } catch (err: any) {
      console.error('Failed to save order details:', err);
      alert(err.message || 'Failed to save order details. Please try again.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCompletePickup = async (orderId: number) => {
    try {
      const authState = JSON.parse(localStorage.getItem('wildwash_auth_state') || '{}');
      const token = authState.token;
      if (!token) {
        throw new Error('Authentication required');
      }

      // Check if user is confirming (double-click pattern)
      if (confirmingOrderId !== orderId) {
        // First click - show confirmation state
        setConfirmingOrderId(orderId);
        // Clear confirmation after 3 seconds
        if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = setTimeout(() => {
          setConfirmingOrderId(null);
        }, 3000);
        return;
      }

      // Second click within 3 seconds - proceed with action
      setConfirmingOrderId(null);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);

      // Set loading state
      setProcessingOrderId(orderId);

      const res = await fetch(`${API_BASE}/orders/update/?id=${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          status: 'picked'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to complete pickup: ${res.status}`);
      }

      // Refresh the orders list and switch to picked page
      // Background polling will pick up the change
      setCurrentStatus('picked'); // Switch to picked page after completion
    } catch (err: any) {
      console.error('Failed to complete pickup:', err);
      alert(err.message || 'Failed to complete pickup. Please try again.');
    } finally {
      // Clear loading state
      setProcessingOrderId(null);
    }
  };

  const handleMarkDelivered = async (orderId: number) => {
    try {
      const authState = JSON.parse(localStorage.getItem('wildwash_auth_state') || '{}');
      const token = authState.token;
      if (!token) throw new Error('Authentication required');

      // Confirmation pattern (reuse confirmingOrderId)
      if (confirmingOrderId !== orderId) {
        setConfirmingOrderId(orderId);
        if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = setTimeout(() => setConfirmingOrderId(null), 3000);
        return;
      }

      // Second click: perform delivery
      setConfirmingOrderId(null);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);

      setProcessingOrderId(orderId);

      const payload: any = { status: 'delivered', delivered_at: new Date().toISOString() };

      const res = await fetch(`${API_BASE}/orders/update/?id=${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to mark delivered: ${res.status}`);
      }

      // Refresh orders and switch to delivered view
      // Background polling will pick up the change
      setCurrentStatus('delivered');
    } catch (err: any) {
      console.error('Failed to mark delivered:', err);
      alert(err?.message || 'Failed to mark delivered.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Find latest location for each rider
  const latestLocationByRider = useMemo(() => {
    const m = new Map<string, RiderLocation>();
    for (const loc of locations) {
      const key = String(loc.rider ?? loc.rider_display ?? loc.id ?? Math.random());
      const cur = m.get(key);
      const tsCur = cur ? new Date(cur.recorded_at ?? 0).getTime() : 0;
      const tsNew = new Date(loc.recorded_at ?? 0).getTime();
      if (!cur || tsNew >= tsCur) m.set(key, loc);
    }
    return m;
  }, [locations]);

  // Filter orders by selected status
  const filteredOrders = useMemo(() => {
    if (currentStatus === 'in_progress') {
      // Show picked, ready and in_progress orders for the in_progress tab (active orders)
      return orders.filter((o) => o.status === 'picked' || o.status === 'ready' || o.status === 'in_progress');
    }
    return orders.filter((o) => o.status === currentStatus);
  }, [orders, currentStatus]);

  /* --- Map helpers --- */
  async function injectLeafletCss() {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = "leaflet-css";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  // Geocode address to coordinates (MOVED TO BACKEND - disabled client-side to avoid CORS and rate limiting)
  // If you need this on the frontend, use a backend endpoint instead of calling Nominatim directly
  async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    // DISABLED: Client-side geocoding causes CORS issues and rate limiting
    // Instead, coordinates should be provided by the backend
    return null;
  }

  function svgDataUrl(svgString: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }

  function getOrderMarkerSvg(status: OrderStatus, isPickup: boolean) {
    const colors: Record<OrderStatus, string> = {
      requested: "#ef4444",
      picked: "#3b82f6",
      in_progress: "#eab308",
      ready: "#22c55e",
      delivered: "#6b7280",
      cancelled: "#9ca3af",
    };

    const color = colors[status] || "#6b7280";

    if (isPickup) {
      return `<?xml version='1.0' encoding='UTF-8'?>
        <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'>
          <path d='M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' fill='${color}'/>
          <path d='M9 7h6M9 10h6M12 7v6' stroke='white' stroke-width='1.5'/>
        </svg>`;
    } else {
      return `<?xml version='1.0' encoding='UTF-8'?>
        <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'>
          <path d='M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' fill='${color}'/>
          <circle cx='12' cy='9' r='3' fill='white'/>
        </svg>`;
    }
  }

  function getRiderMarkerSvg(vehicleType?: string) {
    const v = (vehicleType ?? "").toLowerCase();
    if (v.includes("van") || v.includes("truck") || v.includes("car")) {
      return `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><rect x='1' y='6' width='18' height='8' rx='1.2' fill='#105969'/><rect x='19' y='8' width='3' height='6' rx='0.5' fill='#005966'/><circle cx='6.5' cy='16' r='1.6' fill='#000000'/><circle cx='15.5' cy='16' r='1.6' fill='#000000'/></svg>`;
    } else if (v.includes("motor") || (v.includes("bike") && v.includes("motor"))) {
      return `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><path d='M2 16a3 3 0 006 0' fill='#105969'/><path d='M16 13l2-2 3 1' stroke='#000000' stroke-width='1.2' fill='none'/><circle cx='6' cy='17' r='2' fill='#000000'/><circle cx='18' cy='17' r='2' fill='#000000'/></svg>`;
    } else if (v.includes("bicycle") || v.includes("bike")) {
      return `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><circle cx='6' cy='17' r='2' fill='#000000'/><circle cx='18' cy='17' r='2' fill='#000000'/><path d='M6 17L10 7h3l2 6' stroke='#105969' stroke-width='1.2' fill='none'/></svg>`;
    }
    return `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><path d='M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' fill='#105969'/><circle cx='12' cy='9' r='2.5' fill='#fff'/></svg>`;
  }

  /* --- Render --- */
  return (
    <RouteGuard requireRider>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Left: Order list & filters */}
            <section className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold">Orders</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {(['in_progress', 'picked'] as const).map((status) => {
                    let count = 0;
                    if (status === 'in_progress') {
                      // Count all active orders (picked, ready, in_progress)
                      count = orders.filter(order => 
                        order.status === 'picked' || 
                        order.status === 'ready' || 
                        order.status === 'in_progress'
                      ).length;
                    } else {
                      // Count exact status match
                      count = orders.filter(order => order.status === status).length;
                    }
                    return (
                      <button
                        key={status}
                        onClick={() => setCurrentStatus(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                          currentStatus === status 
                            ? "bg-red-600 text-white shadow-md" 
                            : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span>{capitalize(status)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          currentStatus === status 
                            ? "bg-red-700 text-white" 
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {loadingOrders ? (
                <div className="py-8 text-center">Loading orders...</div>
              ) : errorOrders ? (
                <div className="py-4 text-red-600">Error: {errorOrders}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No orders found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/rider/order/${order.code}`}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-grow">
                        <div className="font-semibold flex items-center gap-2 justify-between">
                          <div>
                            Order {order.code}
                          </div>
                          {order.price !== null && order.price !== undefined && (
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              KES {order.price.toLocaleString()}
                            </div>
                          )}
                        </div>
                        {order.user && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                            Customer: {typeof order.user === 'string' ? order.user : (order.user.first_name || order.user.username || 'Customer')}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <div className="font-medium text-slate-700 dark:text-slate-200">
                            {order.service.name} {order.service.package && `- ${order.service.package}`}
                          </div>
                          <div className="mt-1">Items: {order.items}{order.weight_kg && ` • ${order.weight_kg}kg`}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Created: {formatDateTime(order.created_at)}</div>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          <div>From: {order.pickup_address}</div>
                          <div>To: {order.dropoff_address}</div>
                        </div>
                      </div>
                      {(order.status === 'in_progress' || order.status === 'ready') && (
                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenDetailsForm(order as any);
                            }}
                            className="px-3 py-1 text-sm rounded-full transition-all flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <span>Add Details</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMarkDelivered(order.id);
                            }}
                            disabled={processingOrderId === order.id}
                            className={`px-3 py-1 text-sm rounded-full transition-all flex items-center gap-1 ${confirmingOrderId === order.id ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                          >
                            <span>{confirmingOrderId === order.id ? 'Confirm Deliver' : 'Mark Delivered'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 11a1 1 0 011-1h2.586l1-1H3a1 1 0 110-2h4.586l1-1H6a1 1 0 110-2h6a1 1 0 110 2h-3.586l1 1H17a1 1 0 110 2h-2.586l-1 1H17a1 1 0 110 2H8.414l-1 1H17a1 1 0 110 2H3a1 1 0 01-1-1v-4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>

          {/* Details Modal - Minimalistic */}
          {detailsOrderId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleCloseDetailsForm}>
              <div
                className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Order Details</h3>
                  <button
                    onClick={handleCloseDetailsForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-3 mb-4">
                  {/* Quantity Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Items"
                      value={orderDetails.quantity || ''}
                      onChange={(e) => setOrderDetails(prev => ({
                        ...prev,
                        quantity: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>

                  {/* Weight Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Weight"
                      value={orderDetails.weight_kg || ''}
                      onChange={(e) => setOrderDetails(prev => ({
                        ...prev,
                        weight_kg: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      placeholder="Special instructions..."
                      value={orderDetails.description}
                      onChange={(e) => setOrderDetails(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseDetailsForm}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrderDetails}
                    disabled={processingOrderId === detailsOrderId}
                    className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {processingOrderId === detailsOrderId ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Pickup</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

/* --- Helpers --- */
function formatDateTime(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[m]
  );
}
