"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { client } from '@/lib/api/client';
import { getStoredAuthState, isValidAuthState } from '@/lib/auth';
import { Spinner, OrderStatusUpdate } from '@/components';
import { sortByUrgency, calculateOrderUrgency, getUrgencyLabel } from '@/lib/orderUrgency';

type Order = Record<string, any>;

interface StaffRoleDashboardProps {
  staffRole: 'washer' | 'folder' | 'fumigator' | 'staff';
}

const ROLE_CONFIG = {
  washer: {
    title: 'Washer Dashboard',
    statusAction: 'Mark as Washed',
    targetStatus: 'washed',
    color: 'blue'
  },
  folder: {
    title: 'Folder Dashboard',
    statusAction: 'Mark as Ready',
    targetStatus: 'ready',
    color: 'purple'
  },
  fumigator: {
    title: 'Fumigator Dashboard',
    statusAction: 'Mark as Fumigated',
    targetStatus: 'fumigated',
    color: 'amber'
  },
  staff: {
    title: 'Staff Dashboard',
    statusAction: null,
    targetStatus: null,
    color: 'slate'
  }
};

export default function StaffRoleDashboard({ staffRole }: StaffRoleDashboardProps): React.ReactElement {
  const router = useRouter();
  const config = ROLE_CONFIG[staffRole];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [detailsFormOrderId, setDetailsFormOrderId] = useState<number | null>(null);
  const [detailsForm, setDetailsForm] = useState<{ items?: number; weight_kg?: string; pickup_notes?: string; actual_price?: string }>({});
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riderFilter, setRiderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createOrderForm, setCreateOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    items: 1,
    weight_kg: '',
    pickup_notes: '',
    estimated_price: '',
    order_type: 'walk_in'
  });

  const fetchProfile = useCallback(async () => {
    try {
      const data = await client.get('/users/me/');
      console.log(`[${staffRole.toUpperCase()}] Profile fetched:`, data);
      setProfile(data);
      return data;
    } catch (err: any) {
      throw err;
    }
  }, [staffRole]);

  const fetchOrders = useCallback(async (locationId?: number) => {
    try {
      const data = await client.get('/orders/');
      console.log(`[${staffRole.toUpperCase()}] Raw orders response:`, data);
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      console.log(`[${staffRole.toUpperCase()}] Orders list:`, list);
      console.log(`[${staffRole.toUpperCase()}] List length:`, list.length);
      
      if (list.length === 0) {
        console.log(`[${staffRole.toUpperCase()}] ⚠️ No orders returned from API`);
      }
      
      // Sort orders by date (latest first)
      const sortedList = list.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // descending order (newest first)
      });
      
      setOrders(sortedList);
    } catch (err: any) {
      console.error(`[${staffRole.toUpperCase()}] Error fetching orders:`, err);
      throw err;
    }
  }, [staffRole]);

  const handleCreateOrder = useCallback(async () => {
    try {
      setCreatingOrder(true);
      
      if (!createOrderForm.customer_name.trim()) {
        alert('Customer name is required');
        setCreatingOrder(false);
        return;
      }
      if (!createOrderForm.customer_phone.trim()) {
        alert('Customer phone is required');
        setCreatingOrder(false);
        return;
      }

      const payload = {
        order_type: 'manual',
        drop_off_type: createOrderForm.order_type,
        customer_name: createOrderForm.customer_name,
        customer_phone: createOrderForm.customer_phone,
        items: createOrderForm.items,
        weight_kg: createOrderForm.weight_kg ? Number(createOrderForm.weight_kg) : null,
        description: createOrderForm.pickup_notes,
        price: createOrderForm.estimated_price ? Number(createOrderForm.estimated_price) : null,
        pickup_address: 'Walk-in / Manual Order',
        dropoff_address: createOrderForm.delivery_address || 'To be assigned'
      };

      console.log(`[${staffRole.toUpperCase()}] Creating manual order with payload:`, payload);
      const response = await client.post('/orders/create/', payload);
      console.log(`[${staffRole.toUpperCase()}] Order created:`, response);
      
      setShowCreateOrderModal(false);
      setCreateOrderForm({
        customer_name: '',
        customer_phone: '',
        delivery_address: '',
        items: 1,
        weight_kg: '',
        pickup_notes: '',
        estimated_price: '',
        order_type: 'walk_in'
      });
      
      await fetchOrders();
      alert('Order created successfully!');
    } catch (err: any) {
      console.error(`[${staffRole.toUpperCase()}] Failed to create order:`, err);
      alert(err?.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  }, [createOrderForm, fetchOrders, staffRole]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? getStoredAuthState() : null;

    if (!stored || !isValidAuthState(stored)) {
      router.push('/staff-login');
      return;
    }

    if (stored.user?.role !== 'staff' && stored.user?.role !== 'admin' && stored.user?.role !== 'washer' && stored.user?.role !== 'folder' && stored.user?.role !== 'fumigator' && !stored.user?.is_superuser) {
      setLoading(false);
      setError('You do not have permission to access the staff dashboard.');
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await fetchProfile();
        console.log(`[${staffRole.toUpperCase()}] Profile object:`, me);
        console.log(`[${staffRole.toUpperCase()}] Staff location:`, me?.service_location);
        console.log(`[${staffRole.toUpperCase()}] Staff location display:`, me?.service_location_display);
        await fetchOrders();
      } catch (err: any) {
        setError(err?.message ?? `Failed to load ${staffRole} dashboard`);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile, fetchOrders, router, staffRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="rounded-lg bg-white dark:bg-slate-800 p-8 shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
          <Spinner className="w-8 h-8 text-red-600 dark:text-red-400" />
          <div className="mt-4 text-slate-600 dark:text-slate-400 text-sm">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
            <div className="font-semibold">Error</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const total = orders.length;

  const availableStatuses = Array.from(new Set(orders.map(o => (o.status ?? '').toString()))).filter(Boolean);
  const availableRiders = Array.from(new Set(orders.map(o => {
    if (o.order_type === 'manual') {
      return (o.created_by ?? '').toString();
    }
    return (o.rider ?? '').toString();
  }))).filter(Boolean);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter && String(o.status ?? '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (riderFilter) {
        const assignedTo = o.order_type === 'manual' 
          ? String(o.created_by ?? '').toLowerCase() 
          : String(o.rider ?? '').toLowerCase();
        if (assignedTo !== riderFilter.toLowerCase()) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCode = String(o.code ?? '').toLowerCase().includes(q);
        const assignedTo = o.order_type === 'manual'
          ? String(o.created_by ?? o.customer_name ?? '')
          : String(o.user ?? o.rider ?? '');
        const matchesUser = assignedTo.toLowerCase().includes(q);
        if (!matchesCode && !matchesUser) return false;
      }
      return true;
    });
  }, [orders, statusFilter, riderFilter, searchQuery]);

  const getColorClasses = (colorName: string) => {
    const colors: Record<string, Record<string, string>> = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50'
      },
      amber: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50'
      },
      slate: {
        bg: 'bg-slate-100 dark:bg-slate-900/30',
        text: 'text-slate-700 dark:text-slate-400',
        hover: 'hover:bg-slate-200 dark:hover:bg-slate-900/50'
      }
    };
    return colors[colorName] || colors.slate;
  };

  const colorClasses = getColorClasses(config.color);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{config.title}</h1>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Staff Name:</span> {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : profile?.username}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Location:</span> {profile?.service_location_display ?? profile?.service_location?.name ?? 'Not assigned'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Role:</span> 
                  <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colorClasses.bg} ${colorClasses.text}`}>
                    {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'Staff'}
                  </span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateOrderModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg transition-all"
            >
              + Create Order
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <option value="">All statuses</option>
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={riderFilter}
              onChange={(e) => setRiderFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <option value="">All staff/riders</option>
              {availableRiders.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, customer, or staff"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />

            <button 
              onClick={() => { setStatusFilter(''); setRiderFilter(''); setSearchQuery(''); }} 
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="mb-6">
          <div className="inline-flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total orders for location</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="text-left py-2 px-3 w-32">Code</th>
                  <th className="text-left py-2 px-3 w-72">Status</th>
                  <th className="text-center py-2 px-3 w-32">Urgency</th>
                  <th className="text-left py-2 px-3">Assigned To</th>
                  <th className="text-right py-2 px-3">Estimated Price</th>
                  <th className="text-right py-2 px-3">Actual Price</th>
                  <th className="text-right py-2 px-3">Actions</th>
                  <th className="text-right py-2 px-3 w-32">Date</th>
                </tr>
              </thead>
              <tbody>
                {sortByUrgency(filteredOrders).slice(0, 200).map((o) => {
                  const urgency = calculateOrderUrgency(o);
                  const label = getUrgencyLabel(urgency.score);
                  return (
                    <tr key={o.id ?? o.code} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 px-3 font-mono text-left">
                        <Link href={`/orders/${o.code}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          {o.code}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-left">
                        <div className="flex flex-col gap-2">
                          <div className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium capitalize">
                            {o.status ?? o.state ?? 'requested'}
                          </div>
                          {config.statusAction && config.targetStatus ? (
                            o.status !== config.targetStatus && (
                              <button
                                onClick={async () => {
                                  try {
                                    await client.patch(`/orders/update/?id=${o.id}`, { status: config.targetStatus });
                                    await fetchOrders();
                                  } catch (err: any) {
                                    console.error('Failed to update status:', err);
                                    alert(err?.message || 'Failed to update status');
                                  }
                                }}
                                className={`px-3 py-1 rounded ${colorClasses.bg} ${colorClasses.text} ${colorClasses.hover} text-xs font-medium transition-colors`}
                              >
                                {config.statusAction}
                              </button>
                            )
                          ) : (
                            <OrderStatusUpdate
                              orderId={o.id}
                              currentStatus={o.status ?? o.state ?? 'requested'}
                              onUpdate={fetchOrders}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${label.bgColor} text-white inline-block`}>
                          {label.label} ({urgency.score})
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-900 dark:text-slate-300 text-left">
                        {o.order_type === 'manual' ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {typeof o.created_by === 'object' 
                                ? (o.created_by?.username || o.created_by?.first_name || 'Staff')
                                : o.created_by ?? 'Staff'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-500">(Creator)</span>
                          </div>
                        ) : (
                          <div>
                            {typeof o.rider === 'object' 
                              ? (o.rider?.username || o.rider?.first_name || o.rider?.name || '—')
                              : o.rider ?? o.user ?? '—'}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-300">
                        {(() => {
                          const total = o.total_price ?? null;
                          if (total !== null && total !== undefined && !isNaN(Number(total))) {
                            return `KSh ${Number(total).toLocaleString()}`;
                          }
                          if (o.price !== undefined && o.price !== null && !isNaN(Number(o.price))) {
                            return `KSh ${Number(o.price).toLocaleString()}`;
                          }
                          if (o.price_display) return o.price_display;
                          return '—';
                        })()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-300">
                        {(() => {
                          if (o.actual_price !== undefined && o.actual_price !== null && !isNaN(Number(o.actual_price))) {
                            return `KSh ${Number(o.actual_price).toLocaleString()}`;
                          }
                          return '—';
                        })()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setDetailsFormOrderId(o.id);
                              setDetailsForm({
                                items: o.items ?? 1,
                                weight_kg: o.weight_kg ? String(o.weight_kg) : '',
                                pickup_notes: o.pickup_notes ?? '',
                                actual_price: o.actual_price !== undefined && o.actual_price !== null ? String(o.actual_price) : ''
                              });
                            }}
                            className="px-3 py-1 text-xs rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors shadow-sm hover:shadow-md"
                          >
                            Add details
                          </button>
                          <div className="text-right text-slate-600 dark:text-slate-400">{o.created_at?.split?.('T')?.[0] ?? '—'}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 dark:text-slate-400">
                      No orders found for your location.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Order Modal */}
        {showCreateOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateOrderModal(false)}>
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Create New Order</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Name *</label>
                  <input
                    type="text"
                    value={createOrderForm.customer_name}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    value={createOrderForm.customer_phone}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="e.g. +254712345678"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Delivery Address (Optional)</label>
                  <input
                    type="text"
                    value={createOrderForm.delivery_address}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, delivery_address: e.target.value }))}
                    placeholder="e.g. 123 Main St, Nairobi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drop-off Type *</label>
                  <select
                    value={createOrderForm.order_type}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, order_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  >
                    <option value="walk_in">Walk-in Customer</option>
                    <option value="phone">Phone Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={createOrderForm.items}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, items: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createOrderForm.weight_kg}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description / Items</label>
                  <textarea
                    value={createOrderForm.pickup_notes}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, pickup_notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    rows={3}
                    placeholder="e.g. 5 shirts, 2 towels, 1 blanket"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estimated Price (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createOrderForm.estimated_price}
                    onChange={(e) => setCreateOrderForm(prev => ({ ...prev, estimated_price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    placeholder="e.g. 500.00"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreateOrderModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={creatingOrder || !createOrderForm.customer_name || !createOrderForm.customer_phone}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  {creatingOrder ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details modal overlay */}
        {detailsFormOrderId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailsFormOrderId(null)}>
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Order Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={detailsForm.items ?? 1}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, items: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={detailsForm.weight_kg ?? ''}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Items</label>
                  <textarea
                    value={detailsForm.pickup_notes ?? ''}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, pickup_notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="e.g. 3 shirts, 2 towels"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Actual Price (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={detailsForm.actual_price ?? ''}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, actual_price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 350.00"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDetailsFormOrderId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const payload: any = {
                        status: 'in_progress',
                      };
                      if (detailsForm.items !== undefined) payload.quantity = detailsForm.items;
                      if (detailsForm.weight_kg !== undefined) payload.weight_kg = detailsForm.weight_kg;
                      if (detailsForm.pickup_notes !== undefined) payload.description = detailsForm.pickup_notes;
                      if (detailsForm.actual_price !== undefined && detailsForm.actual_price !== '') payload.actual_price = detailsForm.actual_price;

                      await client.patch(`/orders/update/?id=${detailsFormOrderId}`, payload);
                      setDetailsFormOrderId(null);
                      await fetchOrders();
                    } catch (err: any) {
                      console.error('Failed to save details:', err);
                      alert(err?.message || 'Failed to save details');
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                >
                  Save Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
