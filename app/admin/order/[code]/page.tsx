"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { client } from "@/lib/api/client";
import RouteGuard from "@/components/RouteGuard";
import OrderStaffDetailsViewer from "@/components/OrderStaffDetailsViewer";
import { addToCart } from "@/redux/features/cartSlice";
import { Eye, ArrowLeft, Loader2, AlertCircle, Send, RefreshCw } from "lucide-react";

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
  washer_name?: string;
  folder_name?: string;
  fumigator_name?: string;
  rider_name?: string;
  raw?: Record<string, any>;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffDetailsModalOpen, setStaffDetailsModalOpen] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [rebookLoading, setRebookLoading] = useState(false);

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
      <RouteGuard requireAdmin>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-red-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !order) {
    return (
      <RouteGuard requireAdmin>
        <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Admin
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

  const getRiderName = (rider: any): string => {
    if (!rider) return 'Not assigned';
    if (typeof rider === 'string') return rider;
    if (typeof rider === 'object') {
      return rider.first_name && rider.last_name 
        ? `${rider.first_name} ${rider.last_name}` 
        : rider.username || String(rider.id || '');
    }
    return 'Not assigned';
  };

  const handleInitiatePayment = async () => {
    if (!order?.code || !(order?.raw?.user?.phone || order?.user?.phone)) {
      alert('Order code or customer phone number not found');
      return;
    }

    setInitiatingPayment(true);
    try {
      const amount = (order.actual_price ?? order.price ?? '0').toString().replace(/[^0-9.]/g, '');
      const customerPhone = order.raw?.user?.phone || order.user?.phone;
      
      // Initiate STK push for customer on behalf of admin/rider
      const response = await client.post('/payments/mpesa/stk-push/', {
        order_id: order.code,  // Backend expects 'order_id', not 'order_code'
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


  const handleRebook = async () => {
    if (!order?.order_items || order.order_items.length === 0) {
      alert('No items found in this order to rebook');
      return;
    }

    setRebookLoading(true);
    try {
      // Add each service from the order to cart
      order.order_items.forEach((item: any) => {
        dispatch(addToCart({
          id: item.service_id || Math.random(), // Use service_id if available, otherwise generate unique id
          name: item.service_name || item.service || 'Service',
          price: String(item.service_price || 0),
          description: item.description || '',
          quantity: item.quantity || 1,
        }));
      });

      // Redirect to cart page
      router.push('/book/cart');
    } catch (err) {
      console.error('Error rebooking order:', err);
      alert('Failed to rebook order');
    } finally {
      setRebookLoading(false);
    }
  };

  return (
    <RouteGuard requireAdmin>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header with back button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Admin
          </button>

          {/* Order Header Card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-2">{order.code}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {order.status}
                  </span>
                  {order.is_paid && (
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      ✓ Paid
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Amount</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  KSh {Number(order.actual_price ?? order.price ?? 0).toLocaleString()}
                </div>
                {order.created_at && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {/* Rebook Button for Completed Orders */}
            {order.status === 'delivered' && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleRebook}
                  disabled={rebookLoading}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {rebookLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing Order...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Rebook This Order
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                  Add all services to cart and proceed to checkout
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Customer Information */}
            <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Customer Information</h2>
              
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

              {order.pickup_address && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Pickup Address</p>
                  <p className="text-slate-900 dark:text-slate-100">{order.pickup_address}</p>
                </div>
              )}

              {order.dropoff_address && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Dropoff Address</p>
                  <p className="text-slate-900 dark:text-slate-100">{order.dropoff_address}</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Order Details</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Items</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{order.items || '—'}</p>
                </div>

                {order.weight_kg && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Weight</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{order.weight_kg} kg</p>
                  </div>
                )}

                {order.package && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Package</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{order.package}</p>
                  </div>
                )}

                {order.estimated_delivery && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Est. Delivery</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {new Date(order.estimated_delivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rider Assignment */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Assigned Rider</h2>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {getRiderName(order.rider)}
              </p>
              {order.raw?.rider?.service_location?.name && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {order.raw.rider.service_location.name}
                </p>
              )}
            </div>
          </div>

          {/* Payment Status & Actions */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Payment Status</h2>
            
            <div className="space-y-4">
              {/* Payment Status Indicator */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {order.is_paid ? (
                      <>
                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          ✓ Paid
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">No action needed</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Pending Payment
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Awaiting M-Pesa payment</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mb-1">Amount Due</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    KSh {Number(order.actual_price ?? order.price ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Payment Action Buttons */}
              {!order.is_paid && (
                <div className="flex gap-3">
                  <button
                    onClick={handleInitiatePayment}
                    disabled={initiatingPayment}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {initiatingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending STK Push...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Initiate M-Pesa Payment
                      </>
                    )}
                  </button>
                </div>
              )}

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
            </div>
          </div>

          {/* Staff Input Details */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Staff Input Details</h2>
              <button
                onClick={() => setStaffDetailsModalOpen(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                title="View detailed staff input"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Washer</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">{order.washer_name || '—'}</p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase">Folder</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">{order.folder_name || '—'}</p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase">Fumigator</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">{order.fumigator_name || '—'}</p>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase">Rider</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">{order.rider_name || '—'}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          {order.order_items && order.order_items.length > 0 && (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Order Items</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Service</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Quantity</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4">{item.service_name || item.service || '—'}</td>
                        <td className="py-3 px-4 text-center">{item.quantity || 1}</td>
                        <td className="py-3 px-4 text-right font-semibold">KSh {Number(item.service_price || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Staff Details Modal */}
        {order && (
          <OrderStaffDetailsViewer
            orderId={order.id!}
            orderCode={order.code}
            isOpen={staffDetailsModalOpen}
            onClose={() => setStaffDetailsModalOpen(false)}
          />
        )}
      </div>
    </RouteGuard>
  );
}
