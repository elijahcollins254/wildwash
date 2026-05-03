"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { client } from '@/lib/api/client';
import { getStoredAuthState, isValidAuthState } from '@/lib/auth';
import { Spinner, OrderStatusUpdate } from '@/components';
import Modal from '@/components/ui/Modal';
import { sortByUrgency, calculateOrderUrgency, getUrgencyLabel } from '@/lib/orderUrgency';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

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
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [detailsFormOrderId, setDetailsFormOrderId] = useState<number | null>(null);
  const [detailsForm, setDetailsForm] = useState<{ items?: number; weight_kg?: string; pickup_notes?: string; actual_price?: string }>({});
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riderFilter, setRiderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayLimit, setDisplayLimit] = useState<number>(20); // Keep for manual load more option
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

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

  const fetchOrders = useCallback(async (page: number = 1) => {
    try {
      setOrdersLoading(true);
      // Fetch with pagination using page parameter (25 items per page from backend)
      const data = await client.get(`/orders/?page=${page}`);
      console.log(`[${staffRole.toUpperCase()}] Raw orders response for page ${page}:`, data);
      
      // Handle paginated response
      const paginatedData = data;
      const list: any[] = Array.isArray(paginatedData?.results) ? paginatedData.results : [];
      const count = paginatedData?.count || 0;
      
      console.log(`[${staffRole.toUpperCase()}] Orders list for page ${page}:`, list);
      console.log(`[${staffRole.toUpperCase()}] Total count:`, count);
      console.log(`[${staffRole.toUpperCase()}] List length:`, list.length);
      
      if (list.length === 0 && page === 1) {
        console.log(`[${staffRole.toUpperCase()}] ⚠️ No orders returned from API`);
      }
      
      // Update total count
      setTotalOrdersCount(count);
      
      // Sort orders by date (latest first)
      const sortedList = list.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // descending order (newest first)
      });
      
      // Accumulate orders (avoid duplicates)
      setAllOrders((prev) => {
        if (page === 1) {
          return sortedList; // Reset on first page
        }
        const existingIds = new Set(prev.map(o => o.id));
        const newOrders = sortedList.filter(o => !existingIds.has(o.id));
        return [...prev, ...newOrders];
      });
      
      setOrdersLoading(false);
    } catch (err: any) {
      console.error(`[${staffRole.toUpperCase()}] Error fetching orders:`, err);
      setOrdersLoading(false);
      throw err;
    }
  }, [staffRole]);

  const handleCreateOrder = useCallback(async () => {
    try {
      setCreatingOrder(true);
      
      if (!createOrderForm.customer_name.trim()) {
        showModal('Validation Error', 'Customer name is required', 'warning');
        setCreatingOrder(false);
        return;
      }
      if (!createOrderForm.customer_phone.trim()) {
        showModal('Validation Error', 'Customer phone is required', 'warning');
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
      
      await fetchOrders(1); // Reset to page 1
      setCurrentPage(1);
      setAllOrders([]);
      showModal('Success', 'Order created successfully!', 'success');
    } catch (err: any) {
      console.error(`[${staffRole.toUpperCase()}] Failed to create order:`, err);
      showModal('Error', err?.message || 'Failed to create order', 'error');
    } finally {
      setCreatingOrder(false);
    }
  }, [createOrderForm, fetchOrders, staffRole]);

  // Track loaded data sections to avoid re-fetching
  const loadedSectionsRef = useRef<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  // Check if there are more pages to load
  const hasMore = allOrders.length < totalOrdersCount && totalOrdersCount > 0;

  // Infinite scroll trigger
  const scrollObserverTarget = useInfiniteScroll({
    onLoadMore: () => {
      if (hasMore && !ordersLoading) {
        setCurrentPage((prev) => prev + 1);
      }
    },
    hasMore,
    isLoading: ordersLoading,
    threshold: 500,
  });

  // Update orders from allOrders when page changes
  useEffect(() => {
    setOrders(allOrders);
  }, [allOrders]);

  // Fetch next page when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchOrders(currentPage);
    }
  }, [currentPage, fetchOrders]);

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
        // Load profile first (fast)
        const me = await fetchProfile();
        console.log(`[${staffRole.toUpperCase()}] Profile object:`, me);
        console.log(`[${staffRole.toUpperCase()}] Staff location:`, me?.service_location);
        console.log(`[${staffRole.toUpperCase()}] Staff location display:`, me?.service_location_display);
        
        // Then load first page of orders
        await fetchOrders(1);
        setCurrentPage(1);
        loadedSectionsRef.current.add('orders');
      } catch (err: any) {
        setError(err?.message ?? `Failed to load ${staffRole} dashboard`);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile, fetchOrders, router, staffRole]);

  const total = totalOrdersCount || orders.length;

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

            <select
              value={displayLimit}
              onChange={(e) => setDisplayLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md transition-shadow"
              title="Show this many items per page"
            >
              <option value={20}>Show 20</option>
              <option value={50}>Show 50</option>
              <option value={100}>Show 100</option>
              <option value={200}>Show 200</option>
            </select>

            <button 
              onClick={() => { setStatusFilter(''); setRiderFilter(''); setSearchQuery(''); setDisplayLimit(20); }} 
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
            {ordersLoading && <span className="text-xs text-slate-400">Loading...</span>}
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
                  <th className="text-left py-2 px-3 w-24">Payment</th>
                  <th className="text-center py-2 px-3 w-32">Urgency</th>
                  <th className="text-left py-2 px-3">Assigned To</th>
                  <th className="text-right py-2 px-3">Estimated Price</th>
                  <th className="text-right py-2 px-3">Actual Price</th>
                  <th className="text-right py-2 px-3">Actions</th>
                  <th className="text-right py-2 px-3 w-32">Date</th>
                </tr>
              </thead>
              <tbody>
                {sortByUrgency(filteredOrders).sort((a, b) => {
                  const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return dateB - dateA; // Latest first
                }).slice(0, displayLimit).map((o) => {
                  const urgency = calculateOrderUrgency(o);
                  const label = getUrgencyLabel(urgency.score);
                  return (
                    <tr key={o.id ?? o.code} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 px-3 font-mono text-left">
                        <Link href={`/staff/order/${o.code}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
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
                                    // Optimistically update the order status immediately
                                    setOrders(prevOrders => 
                                      prevOrders.map(order => 
                                        order.id === o.id 
                                          ? { ...order, status: config.targetStatus }
                                          : order
                                      )
                                    );
                                    
                                    // Then make the API call
                                    await client.patch(`/orders/update/?id=${o.id}`, { status: config.targetStatus });
                                  } catch (err: any) {
                                    console.error('Failed to update status:', err);
                                    // Revert on error by fetching fresh data
                                    await fetchOrders(1);
                                    showModal('Error', err?.message || 'Failed to update status', 'error');
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
                      <td className="py-2 px-3 text-left">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          o.is_paid 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {o.is_paid ? '✓ Paid' : 'Pending'}
                        </span>
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
                          // Map role-specific price fields
                          const roleFieldMap: Record<string, { price: string; items: string; notes: string; weight: string }> = {
                            washer: { price: 'washer_price', items: 'washer_items', notes: 'washer_notes', weight: 'washer_weight' },
                            folder: { price: 'folder_price', items: 'folder_items', notes: 'folder_notes', weight: 'folder_weight' },
                            fumigator: { price: 'fumigator_price', items: 'fumigator_items', notes: 'fumigator_notes', weight: 'fumigator_weight' },
                            staff: { price: 'staff_price', items: 'staff_items', notes: 'staff_notes', weight: 'staff_weight' },
                          };
                          
                          const rolePrice = o[roleFieldMap[staffRole]?.price];
                          
                          // Check role-specific price first, then fall back to actual_price
                          if (rolePrice !== undefined && rolePrice !== null && !isNaN(Number(rolePrice))) {
                            return `KSh ${Number(rolePrice).toLocaleString()}`;
                          }
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
                              // Map generic field names to role-specific field names for loading
                              const roleFieldMap: Record<string, { price: string; items: string; notes: string; weight: string }> = {
                                washer: { price: 'washer_price', items: 'washer_items', notes: 'washer_notes', weight: 'washer_weight' },
                                folder: { price: 'folder_price', items: 'folder_items', notes: 'folder_notes', weight: 'folder_weight' },
                                fumigator: { price: 'fumigator_price', items: 'fumigator_items', notes: 'fumigator_notes', weight: 'fumigator_weight' },
                                staff: { price: 'staff_price', items: 'staff_items', notes: 'staff_notes', weight: 'staff_weight' },
                              };
                              
                              const fieldMap = roleFieldMap[staffRole];
                              
                              setDetailsFormOrderId(o.id);
                              setDetailsForm({
                                items: o[fieldMap.items] ?? o.items ?? 1,
                                weight_kg: o[fieldMap.weight] ? String(o[fieldMap.weight]) : (o.weight_kg ? String(o.weight_kg) : ''),
                                pickup_notes: o[fieldMap.notes] ?? o.pickup_notes ?? '',
                                actual_price: o[fieldMap.price] !== undefined && o[fieldMap.price] !== null ? String(o[fieldMap.price]) : (o.actual_price !== undefined && o.actual_price !== null ? String(o.actual_price) : '')
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

          {/* Infinite scroll loader trigger */}
          {hasMore && !ordersLoading && (
            <div ref={scrollObserverTarget} className="h-10 mt-8" />
          )}

          {/* Loading indicator when fetching more */}
          {ordersLoading && currentPage > 1 && (
            <div className="flex justify-center py-8">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-red-600 rounded-full" />
              </div>
            </div>
          )}

          {/* All loaded indicator */}
          {!hasMore && orders.length > 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                ✓ All {totalOrdersCount} orders loaded
              </p>
            </div>
          )}

          {/* Manual load more option (kept for backwards compatibility) */}
          {filteredOrders.length > displayLimit && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing <span className="font-semibold">{displayLimit}</span> of <span className="font-semibold">{filteredOrders.length}</span> orders
              </div>
              <button
                onClick={() => setDisplayLimit(prev => Math.min(prev + 50, filteredOrders.length))}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                Load More
              </button>
            </div>
          )}
        </div>
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
                        staff_role: staffRole, // Include staff role so backend knows which role made the change
                      };
                      
                      // Map generic field names to role-specific field names
                      const roleFieldMap: Record<string, { price: string; items: string; notes: string; weight: string }> = {
                        washer: { price: 'washer_price', items: 'washer_items', notes: 'washer_notes', weight: 'washer_weight' },
                        folder: { price: 'folder_price', items: 'folder_items', notes: 'folder_notes', weight: 'folder_weight' },
                        fumigator: { price: 'fumigator_price', items: 'fumigator_items', notes: 'fumigator_notes', weight: 'fumigator_weight' },
                        staff: { price: 'staff_price', items: 'staff_items', notes: 'staff_notes', weight: 'staff_weight' },
                      };
                      
                      const fieldMap = roleFieldMap[staffRole];
                      
                      if (detailsForm.items !== undefined && detailsForm.items) {
                        payload[fieldMap.items] = parseInt(String(detailsForm.items), 10);
                      }
                      
                      if (detailsForm.weight_kg !== undefined && detailsForm.weight_kg !== '' && detailsForm.weight_kg !== null) {
                        const weightNum = parseFloat(String(detailsForm.weight_kg));
                        if (!isNaN(weightNum)) {
                          payload[fieldMap.weight] = weightNum;
                        }
                      }
                      
                      if (detailsForm.pickup_notes !== undefined && detailsForm.pickup_notes) {
                        payload[fieldMap.notes] = String(detailsForm.pickup_notes);
                      }
                      
                      if (detailsForm.actual_price !== undefined && detailsForm.actual_price !== '' && detailsForm.actual_price !== null) {
                        const priceNum = parseFloat(String(detailsForm.actual_price));
                        if (!isNaN(priceNum)) {
                          payload[fieldMap.price] = priceNum;
                        }
                      }

                      console.log('[SaveDetails] Sending payload:', payload);
                      
                      // Store the order ID before clearing it
                      const orderId = detailsFormOrderId;
                      
                      // Store original order for rollback
                      const originalOrder = orders.find(o => o.id === orderId);
                      
                      // Optimistically update the order immediately
                      setOrders(prevOrders =>
                        prevOrders.map(order =>
                          order.id === orderId
                            ? {
                                ...order,
                                status: payload.status,
                                [fieldMap.items]: payload[fieldMap.items] ?? order[fieldMap.items],
                                [fieldMap.weight]: payload[fieldMap.weight] ?? order[fieldMap.weight],
                                [fieldMap.notes]: payload[fieldMap.notes] ?? order[fieldMap.notes],
                                [fieldMap.price]: payload[fieldMap.price] ?? order[fieldMap.price],
                              }
                            : order
                        )
                      );
                      
                      setDetailsFormOrderId(null);
                      
                      // Make the API call
                      await client.patch(`/orders/update/?id=${orderId}`, payload);
                      
                      // Refresh first page of orders from server to ensure data is up-to-date
                      await fetchOrders(1);
                    } catch (err: any) {
                      console.error('Failed to save details:', err);
                      // Revert to original data on error
                      await fetchOrders(1);
                      showModal('Error', err?.message || 'Failed to save details', 'error');
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
