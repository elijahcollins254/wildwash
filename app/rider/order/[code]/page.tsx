"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { client } from "@/lib/api/client";
import RouteGuard from "@/components/RouteGuard";
import OrderStaffDetailsViewer from "@/components/OrderStaffDetailsViewer";
import { Eye, ArrowLeft, Loader2, AlertCircle, Send, RefreshCw, CheckCircle } from "lucide-react";

interface OrderDetail {
  id?: number;
  code?: string;
  created_at?: string;
  price?: string | number;
  actual_price?: string | number;
  status?: string;
  rider?: any;
  user?: any;
  service_location?: any;
  items?: number;
  weight_kg?: number;
  package?: string;
  pickup_address?: string;
  dropoff_address?: string;
  estimated_delivery?: string;
  is_paid?: boolean;
  order_items?: any[];
  staff_input_details?: any;
  rider_name?: string;
  raw?: Record<string, any>;
}

export default function RiderOrderDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffDetailsModalOpen, setStaffDetailsModalOpen] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await client.get(`/orders/?code=${params.code}`);
        // Response is either an array or paginated object with results
        const orderData = Array.isArray(response) ? response[0] : response?.results?.[0];
        
        if (!orderData) {
          setError('Order not found');
          return;
        }
        
        // Store the full response in raw property for accessing user data
        const orderWithRaw = {
          ...orderData,
          raw: orderData,
        };
        
        setOrder(orderWithRaw);
      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError(err?.message ?? 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (params.code) {
      fetchOrder();
    }
  }, [params.code]);

  if (loading) {
    return (
      <RouteGuard requireRider>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-teal-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !order) {
    return (
      <RouteGuard requireRider>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Orders
            </button>
            
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error || 'Order not found'}</span>
              </div>
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const handleInitiatePayment = async () => {
    if (!order?.code || !(order?.raw?.user?.phone || order?.user?.phone)) {
      alert('Order code or customer phone number not found');
      return;
    }

    // IMPORTANT: Only use actual_price if it's set
    if (!order.actual_price) {
      alert('Cannot initiate payment: Staff has not set the actual price for this order. Please set the actual_price before attempting checkout.');
      return;
    }

    setInitiatingPayment(true);
    try {
      const amount = order.actual_price.toString().replace(/[^0-9.]/g, '');
      const customerPhone = order.raw?.user?.phone || order.user?.phone;
      
      // Initiate STK push for customer on behalf of rider
      const response = await client.post('/payments/mpesa/stk-push/', {
        order_id: order.code,
        phone: customerPhone,
        amount: parseFloat(amount),
      });

      if (response.status === 'success' || response.success) {
        alert(`STK Push sent to ${customerPhone}. Customer will enter their M-Pesa PIN to complete payment.`);
        
        // Refresh order data after a few seconds to check if payment completed
        setTimeout(() => {
          const fetchOrder = async () => {
            try {
              const response = await client.get(`/orders/?code=${order.code}`);
              const orderData = Array.isArray(response) ? response[0] : response?.results?.[0];
              if (orderData) {
                setOrder({ ...orderData, raw: orderData });
              }
            } catch (err) {
              console.error('Error refreshing order:', err);
            }
          };
          fetchOrder();
        }, 3000);
      } else {
        alert(`Failed to initiate payment: ${response.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      alert(`Error: ${err?.message || 'Failed to initiate payment'}`);
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order?.id) {
      alert('Order ID not found');
      return;
    }

    setCompletingOrder(true);
    try {
      const response = await client.patch(`/orders/update/?id=${order.id}`, {
        status: 'delivered'
      });

      alert('Order marked as delivered successfully!');
      
      // Refresh order data
      const fetchOrder = async () => {
        try {
          const response = await client.get(`/orders/?code=${order.code}`);
          const orderData = Array.isArray(response) ? response[0] : response?.results?.[0];
          if (orderData) {
            setOrder({ ...orderData, raw: orderData });
          }
        } catch (err) {
          console.error('Error refreshing order:', err);
        }
      };
      fetchOrder();
    } catch (err: any) {
      console.error('Error completing order:', err);
      alert(`Error: ${err?.message || 'Failed to complete order'}`);
    } finally {
      setCompletingOrder(false);
    }
  };

  return (
    <RouteGuard requireRider>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </button>

          {/* Order Header */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Order {order.code}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Created: {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  KSh {(order.actual_price ?? order.price ?? 0).toLocaleString()}
                </div>
                <div className={`mt-2 inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                  order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  order.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Full Name</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {(order.raw?.user?.first_name || order.user?.first_name) && (order.raw?.user?.last_name || order.user?.last_name)
                    ? `${order.raw?.user?.first_name || order.user?.first_name} ${order.raw?.user?.last_name || order.user?.last_name}`
                    : order.raw?.user?.username || order.user?.username || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Phone</p>
                <p className="font-semibold text-slate-900 dark:text-white">{order.raw?.user?.phone || order.user?.phone || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Email</p>
                <p className="font-semibold text-slate-900 dark:text-white">{order.raw?.user?.email || order.user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Location</p>
                <p className="font-semibold text-slate-900 dark:text-white">{order.raw?.user?.location || order.user?.location || '—'}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Items</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{order.items || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Weight</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{order.weight_kg ? `${order.weight_kg} kg` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Package Type</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{order.package || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Est. Delivery</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Addresses</h2>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-2">Pickup Address</p>
              <p className="font-semibold text-slate-900 dark:text-white mb-4">{order.pickup_address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-2">Dropoff Address</p>
              <p className="font-semibold text-slate-900 dark:text-white">{order.dropoff_address || '—'}</p>
            </div>
          </div>

          {/* Payment Section */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Payment</h2>
            
            {/* Payment Status */}
            <div className={`p-3 rounded-lg border mb-4 ${
              order.is_paid 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <p className={`text-sm font-semibold ${
                order.is_paid 
                  ? 'text-green-700 dark:text-green-400' 
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                Status: <span className="font-bold">{order.is_paid ? 'PAID' : 'PENDING'}</span>
              </p>
            </div>

            {/* Payment Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase mb-1">Payment Method</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                M-Pesa STK Push to <span className="font-mono font-bold">{order.raw?.user?.phone || order.user?.phone || 'N/A'}</span>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Click "Initiate M-Pesa Payment" to send STK push. Customer will enter their PIN to complete payment.
              </p>
            </div>

            {/* Payment Button */}
            {!order.is_paid && (
              <button
                onClick={handleInitiatePayment}
                disabled={initiatingPayment}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors"
              >
                {initiatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Initiate M-Pesa Payment
                  </>
                )}
              </button>
            )}
          </div>

          {/* Order Completion Section */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Order Status</h2>
            
            {order.status === 'delivered' ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Order Completed</p>
                  <p className="text-sm text-green-600 dark:text-green-500">This order has been successfully delivered.</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCompleteOrder}
                disabled={completingOrder}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors"
              >
                {completingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Delivered
                  </>
                )}
              </button>
            )}
          </div>

          {/* Order Items */}
          {order.order_items && order.order_items.length > 0 && (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Order Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Service</th>
                      <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400">Quantity</th>
                      <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-3 text-slate-900 dark:text-white">{item.service_name || item.service || '—'}</td>
                        <td className="py-2 px-3 text-center text-slate-900 dark:text-white">{item.quantity || 1}</td>
                        <td className="py-2 px-3 text-right text-slate-900 dark:text-white">
                          KSh {(item.service_price || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
