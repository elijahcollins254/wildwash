"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Package } from "lucide-react";
import Link from "next/link";
import RouteGuard from "@/components/RouteGuard";
import Modal from "@/components/ui/Modal";
import { useBackgroundOrderPolling } from "@/lib/hooks/useBackgroundOrderPolling";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* --- Types --- */
type OrderStatus = 'requested' | 'picked' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

type Order = {
  id: number;
  code: string;
  service?: {
    name?: string;
    package?: string;
  } | null;
  pickup_address: string;
  dropoff_address: string;
  status: OrderStatus;
  urgency: number;
  items: number;
  weight_kg?: number | null;
  price?: number | null;
  actual_price?: string | number | null; // price entered by staff
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
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('in_progress');

  // Confirmation state for action buttons (orderId -> timestamp)
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal state for error messages
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info' | 'warning'>('error');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  // Order details form state
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    quantity: undefined,
    weight_kg: undefined,
    description: '',
  });



  // Get authentication token
  const authState = JSON.parse(
    typeof window !== 'undefined' ? localStorage.getItem('wildwash_auth_state') || '{}' : '{}'
  );
  const token = authState.token || null;

  // Use background polling for orders - smart updates without page reload
  const orders = useBackgroundOrderPolling(token, true, 60000); // 60 second default interval

  // Update loading state when orders arrive and capture errors
  useEffect(() => {
    if (orders && orders.length > 0 && loadingOrders) {
      setLoadingOrders(false);
    }
  }, [orders, loadingOrders]);

  // Cleanup confirmation timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  /* --- Data fetchers --- */
  // Orders are fetched automatically via background polling service
  // No manual refresh needed - polling handles it intelligently

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
      showModal('Error', err.message || 'Failed to save order details. Please try again.', 'error');
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
      showModal('Error', err.message || 'Failed to complete pickup. Please try again.', 'error');
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
      showModal('Error', err?.message || 'Failed to mark delivered.', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Display orders from background polling
  const displayOrders = orders;

  // Filter orders by selected status
  const filteredOrders = useMemo(() => {
    if (currentStatus === 'in_progress') {
      // Show picked, ready and in_progress orders for the in_progress tab (active orders)
      return displayOrders.filter((o) => o.status === 'picked' || o.status === 'ready' || o.status === 'in_progress');
    }
    return displayOrders.filter((o) => o.status === currentStatus);
  }, [displayOrders, currentStatus]);



  /* --- Render --- */
  return (
    <RouteGuard requireRider>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Left: Order list & filters */}
            <section className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold">Orders</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {(['in_progress', 'picked', 'delivered'] as const).map((status) => {
                    let count = 0;
                    if (status === 'in_progress') {
                      // Count all active orders (picked, ready, in_progress)
                      count = displayOrders.filter(order => 
                        order.status === 'picked' || 
                        order.status === 'ready' || 
                        order.status === 'in_progress'
                      ).length;
                    } else {
                      // Count exact status match
                      count = displayOrders.filter(order => order.status === status).length;
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

              {loadingOrders ? (
                <div className="py-8 text-center text-slate-500">
                  <div className="animate-pulse mb-4">⏳ Loading orders...</div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                    ))}
                  </div>
                </div>
              ) : orderLoadError ? (
                <div className="py-8 text-center">
                  <div className="text-red-600 font-semibold mb-2">Error loading orders</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{orderLoadError}</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No orders found.</div>
              ) : (
                <div>
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
                            {order.service?.name} {order.service?.package && `- ${order.service.package}`}
                          </div>
                          <div className="mt-1">Items: {order.items}{order.weight_kg && ` • ${order.weight_kg}kg`}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Created: {formatDateTime(order.created_at)}</div>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          <div>From: {order.pickup_address}</div>
                          <div>To: {order.dropoff_address}</div>
                        </div>
                      </div>
                      {(order.status === 'in_progress' || order.status === 'ready' || order.status === 'picked') && (
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
      
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalOpen(false)}
      />
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
