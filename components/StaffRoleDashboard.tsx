"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { client } from '@/lib/api/client';
import { getStoredAuthState, isValidAuthState } from '@/lib/auth';
import { Spinner, OrderStatusUpdate } from '@/components';
import Modal from '@/components/ui/Modal';
import { calculateOrderUrgency, getUrgencyLabel } from '@/lib/orderUrgency';
import { useOrders } from '@/lib/context/OrderContext';

const PickupMap = dynamic(() => import('@/components/PickupMap'), { ssr: false });
const DEFAULT_WASHER_POSITION: [number, number] = [-1.286389, 36.817223];

// Debounce helper for search
function debounce(fn: Function, ms: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

type Order = Record<string, any>;

type WasherAnalytics = {
  completed_orders: number;
  in_progress_orders: number;
  revenue: number;
  commission_rate: number;
  commission: number;
  reviews: Array<Record<string, any>>;
  average_rating?: number | null;
};

interface StaffRoleDashboardProps {
  staffRole: 'washer' | 'folder' | 'fumigator' | 'staff' | 'admin';
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
  },
  admin: {
    title: 'Admin Staff Dashboard',
    statusAction: null,
    targetStatus: null,
    color: 'slate'
  }
};

export default function StaffRoleDashboard({ staffRole }: StaffRoleDashboardProps): React.ReactElement {
  const router = useRouter();
  const config = ROLE_CONFIG[staffRole];
  
  // Use shared OrderContext instead of local state - reduces load time significantly
  const {
    orders,
    totalOrdersCount,
    isLoading: ordersLoading,
    error: orderError,
    statusFilter,
    riderFilter,
    searchQuery,
    setStatusFilter,
    setRiderFilter,
    setSearchQuery,
    resetFilters,
    refetchOrders,
    loadMoreOrders,
  } = useOrders();
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'orders' | 'analytics' | 'payments' | 'profile'>('orders');
  const [washerAnalytics, setWasherAnalytics] = useState<WasherAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsHasLoaded, setAnalyticsHasLoaded] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [washerProfileForm, setWasherProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    pickup_address: '',
    machine_count: '0',
  });
  const [washerPosition, setWasherPosition] = useState<[number, number] | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [detailsFormOrderId, setDetailsFormOrderId] = useState<number | null>(null);
  const [detailsForm, setDetailsForm] = useState<{ items?: number; weight_kg?: string; pickup_notes?: string; actual_price?: string }>({});
  const [displayLimit, setDisplayLimit] = useState<number>(20);
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
      
      // Use refetchOrders from context instead of local function
      await refetchOrders();
      showModal('Success', 'Order created successfully!', 'success');
    } catch (err: any) {
      console.error(`[${staffRole.toUpperCase()}] Failed to create order:`, err);
      showModal('Error', err?.message || 'Failed to create order', 'error');
    } finally {
      setCreatingOrder(false);
    }
  }, [createOrderForm, refetchOrders, staffRole]);

  // Compute if there are more pages to load
  const hasMore = orders.length < totalOrdersCount && totalOrdersCount > 0;

  const loadMore = useCallback(() => {
    if (hasMore && !ordersLoading) {
      return loadMoreOrders().then(() => {
        setDisplayLimit(prev => prev + 20);
      });
    }
  }, [hasMore, loadMoreOrders, ordersLoading]);

  // Initialize: fetch profile once on mount
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

    // Fetch profile only once
    (async () => {
      try {
        const meData = await client.get('/users/me/');
        console.log(`[${staffRole.toUpperCase()}] Profile fetched:`, meData);
        setProfile(meData);
        if (staffRole === 'washer') {
          setWasherProfileForm({
            first_name: meData.first_name ?? '',
            last_name: meData.last_name ?? '',
            phone: meData.phone ?? '',
            email: meData.email ?? '',
            pickup_address: meData.pickup_address ?? '',
            machine_count: String(meData.machine_count ?? 0),
          });
          if (meData.pickup_latitude != null && meData.pickup_longitude != null) {
            setWasherPosition([Number(meData.pickup_latitude), Number(meData.pickup_longitude)]);
          }
        }
        setLoading(false);
      } catch (err: any) {
        setError(err?.message ?? `Failed to load ${staffRole} dashboard`);
        setLoading(false);
      }
    })();

  }, [staffRole, router]);

  const loadWasherAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const data = await client.get('/orders/washer-analytics/');
      setWasherAnalytics(data);
    } catch (err: any) {
      setAnalyticsError(err?.message || 'Unable to load washer analytics.');
    } finally {
      setAnalyticsLoading(false);
      setAnalyticsHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (staffRole === 'washer' && (activeDashboardTab === 'analytics' || activeDashboardTab === 'payments') && !analyticsHasLoaded && !analyticsLoading) {
      void loadWasherAnalytics();
    }
  }, [staffRole, activeDashboardTab, analyticsHasLoaded, analyticsLoading, loadWasherAnalytics]);

  const saveWasherProfile = useCallback(async () => {
    const machineCount = Number(washerProfileForm.machine_count);
    if (!Number.isInteger(machineCount) || machineCount < 0) {
      setProfileError('Machine count must be a whole number of zero or more.');
      setProfileMessage('');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const updatedProfile = await client.patch('/users/me/', {
        first_name: washerProfileForm.first_name.trim(),
        last_name: washerProfileForm.last_name.trim(),
        phone: washerProfileForm.phone.trim(),
        email: washerProfileForm.email.trim(),
        pickup_address: washerProfileForm.pickup_address.trim(),
        machine_count: machineCount,
        pickup_latitude: washerPosition?.[0] ?? null,
        pickup_longitude: washerPosition?.[1] ?? null,
      });
      setProfile(updatedProfile);
      setProfileMessage('Washer profile saved.');
    } catch (err: any) {
      setProfileError(err?.message || 'Unable to save washer profile.');
    } finally {
      setProfileSaving(false);
    }
  }, [washerPosition, washerProfileForm]);

  const total = totalOrdersCount || orders.length;

  // Build available options from current orders (for dropdowns)
  const availableStatuses = useMemo(() => 
    Array.from(new Set(orders.map(o => (o.status ?? '').toString()))).filter(Boolean),
    [orders]
  );
  
  const availableRiders = useMemo(() => 
    Array.from(new Set(orders.map(o => {
      if (o.order_type === 'manual') {
        return (o.created_by ?? '').toString();
      }
      return (o.rider ?? '').toString();
    }))).filter(Boolean),
    [orders]
  );

  // Orders already filtered by backend via context, just apply display sorting
  // Sort by creation date (latest first)
  const filteredOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Descending order (latest first)
    });
  }, [orders]);

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
            {activeDashboardTab === 'orders' && <button 
              onClick={() => setShowCreateOrderModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg transition-all"
            >
              + Create Order
            </button>}
          </div>
          {staffRole === 'washer' && (
            <nav aria-label="Washer dashboard sections" className="mb-5 flex w-full flex-nowrap gap-2 overflow-x-auto border-b border-slate-200 pb-3 touch-pan-x dark:border-slate-700">
              {(['orders', 'analytics', 'payments', 'profile'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveDashboardTab(tab)}
                  aria-current={activeDashboardTab === tab ? 'page' : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${activeDashboardTab === tab ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          )}
          {(staffRole !== 'washer' || activeDashboardTab === 'orders') && <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                try {
                  setStatusFilter(e.target.value);
                } catch (err: any) {
                  showModal('Filter Error', err?.message || 'Failed to apply status filter', 'error');
                }
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <option value="">All statuses</option>
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={riderFilter}
              onChange={(e) => {
                try {
                  setRiderFilter(e.target.value);
                } catch (err: any) {
                  showModal('Filter Error', err?.message || 'Failed to apply rider filter', 'error');
                }
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <option value="">All staff/riders</option>
              {availableRiders.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <input
              value={searchQuery}
              onChange={(e) => {
                try {
                  setSearchQuery(e.target.value);
                } catch (err: any) {
                  showModal('Search Error', err?.message || 'Failed to search orders', 'error');
                }
              }}
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
              onClick={() => { resetFilters(); setDisplayLimit(20); }} 
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Reset
            </button>
          </div>}
        </header>

        {(staffRole !== 'washer' || activeDashboardTab === 'orders') && <>
        <div className="mb-6">
          <div className="inline-flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total orders for location</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</div>
            {ordersLoading && <span className="text-xs text-slate-400">Loading...</span>}
          </div>
        </div>

        {/* Loading Skeleton */}
        {ordersLoading && orders.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="mb-4 space-y-4">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded col-span-2"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded col-span-2"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-8 text-slate-400">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-red-600 rounded-full animate-spin"></div>
                <span>Fetching orders...</span>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {(!ordersLoading || orders.length > 0) && (
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
                {filteredOrders.slice(0, displayLimit).map((o) => {
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
                                    // Make the API call to update status
                                    await client.patch(`/orders/update/?id=${o.id}`, { status: config.targetStatus });
                                    
                                    // Refetch orders from context to update UI
                                    await refetchOrders();
                                    showModal('Success', 'Status updated successfully!', 'success');
                                  } catch (err: any) {
                                    console.error('Failed to update status:', err);
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
                              onUpdate={async () => {
                                try {
                                  await refetchOrders();
                                  showModal('Success', 'Order status updated successfully!', 'success');
                                } catch (err: any) {
                                  showModal('Update Error', err?.message || 'Failed to update order status', 'error');
                                }
                              }}
                              onError={(error: string) => showModal('Status Update Error', error, 'error')}
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
                            admin: { price: 'staff_price', items: 'staff_items', notes: 'staff_notes', weight: 'staff_weight' },
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

          {/* Pagination */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={async () => {
                  try {
                    await loadMore();
                  } catch (err: any) {
                    showModal('Loading Error', err?.message || 'Failed to load more orders', 'error');
                  }
                }}
                disabled={ordersLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {ordersLoading ? 'Loading...' : 'Load More Orders'}
              </button>
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
        )}
        </>}

        {staffRole === 'washer' && activeDashboardTab === 'analytics' && (
          <section aria-labelledby="washer-analytics-heading" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="washer-analytics-heading" className="text-xl font-bold text-slate-900 dark:text-white">Washer analytics</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your order activity and customer feedback.</p>
              </div>
              <button type="button" onClick={() => void loadWasherAnalytics()} disabled={analyticsLoading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {analyticsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {analyticsError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{analyticsError}</div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed orders</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{analyticsLoading && !washerAnalytics ? '—' : washerAnalytics?.completed_orders ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">In progress</p>
                <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-400">{analyticsLoading && !washerAnalytics ? '—' : washerAnalytics?.in_progress_orders ?? 0}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Customer ratings &amp; reviews</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {washerAnalytics?.average_rating != null ? `Average rating: ${Number(washerAnalytics.average_rating).toFixed(1)} / 5` : 'Ratings summary'}
                  </p>
                </div>
                {washerAnalytics?.reviews?.length ? <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{washerAnalytics.reviews.length} review{washerAnalytics.reviews.length === 1 ? '' : 's'}</span> : null}
              </div>
              {washerAnalytics?.reviews?.length ? (
                <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
                  {washerAnalytics.reviews.map((review, index) => (
                    <li key={String(review.id ?? index)} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">{review.customer_name ?? review.customer ?? 'Customer'}</span>
                        {review.rating != null && <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">★ {Number(review.rating).toFixed(1)} / 5</span>}
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{review.comment ?? review.review ?? review.text ?? 'No written comment.'}</p>
                      {review.created_at && <p className="mt-2 text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">Customer ratings and reviews will appear here when feedback is enabled for orders.</p>
              )}
            </div>
          </section>
        )}

        {staffRole === 'washer' && activeDashboardTab === 'payments' && (
          <section aria-labelledby="washer-payments-heading" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="washer-payments-heading" className="text-xl font-bold text-slate-900 dark:text-white">Payments</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Revenue and estimated commission from your assigned orders.</p>
              </div>
              <button type="button" onClick={() => void loadWasherAnalytics()} disabled={analyticsLoading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {analyticsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {analyticsError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{analyticsError}</div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Paid revenue</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">KSh {Number(washerAnalytics?.revenue ?? 0).toLocaleString('en-KE')}</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Commission ({((washerAnalytics?.commission_rate ?? 0.1) * 100).toFixed(0)}%)</p>
                <p className="mt-2 text-3xl font-bold text-violet-700 dark:text-violet-400">KSh {Number(washerAnalytics?.commission ?? 0).toLocaleString('en-KE')}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Revenue reflects payments received for orders assigned to your washer account. Commission is an estimate based on the configured rate.</p>
          </section>
        )}

        {staffRole === 'washer' && activeDashboardTab === 'profile' && (
          <section aria-labelledby="washer-profile-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h2 id="washer-profile-heading" className="text-xl font-bold text-slate-900 dark:text-white">Washer profile</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your contact details, service pin and available machines.</p>
            </div>
            {profileError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{profileError}</div>}
            {profileMessage && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{profileMessage}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First name
                <input value={washerProfileForm.first_name} onChange={(event) => setWasherProfileForm((current) => ({ ...current, first_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last name
                <input value={washerProfileForm.last_name} onChange={(event) => setWasherProfileForm((current) => ({ ...current, last_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone number
                <input type="tel" value={washerProfileForm.phone} onChange={(event) => setWasherProfileForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email
                <input type="email" value={washerProfileForm.email} onChange={(event) => setWasherProfileForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location / address
                <input value={washerProfileForm.pickup_address} onChange={(event) => setWasherProfileForm((current) => ({ ...current, pickup_address: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="Washer business or pickup address" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Number of machines
                <input type="number" min="0" step="1" value={washerProfileForm.machine_count} onChange={(event) => setWasherProfileForm((current) => ({ ...current, machine_count: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </label>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">GPS drop pin</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Click the map or drag the marker to set your washer location.</p>
                </div>
                {washerPosition && <span className="text-xs text-slate-500 dark:text-slate-400">{washerPosition[0].toFixed(6)}, {washerPosition[1].toFixed(6)}</span>}
              </div>
              <PickupMap position={washerPosition ?? DEFAULT_WASHER_POSITION} hasPin={washerPosition !== null} onChange={(position: [number, number]) => { setWasherPosition(position); setProfileError(''); setProfileMessage(''); }} />
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Latitude
                  <input type="number" step="0.000001" value={washerPosition?.[0] ?? ''} onChange={(event) => {
                    const latitude = event.target.value === '' ? null : Number(event.target.value);
                    setWasherPosition(latitude === null ? null : [latitude, washerPosition?.[1] ?? DEFAULT_WASHER_POSITION[1]]);
                    setProfileMessage('');
                  }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Longitude
                  <input type="number" step="0.000001" value={washerPosition?.[1] ?? ''} onChange={(event) => {
                    const longitude = event.target.value === '' ? null : Number(event.target.value);
                    setWasherPosition(longitude === null ? null : [washerPosition?.[0] ?? DEFAULT_WASHER_POSITION[0], longitude]);
                    setProfileMessage('');
                  }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                </label>
              </div>
              <button type="button" onClick={() => { setWasherPosition(null); setProfileMessage(''); }} className="mt-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">Clear location pin</button>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => void saveWasherProfile()} disabled={profileSaving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </section>
        )}

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
                        admin: { price: 'staff_price', items: 'staff_items', notes: 'staff_notes', weight: 'staff_weight' },
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
                      
                      // Make the API call
                      await client.patch(`/orders/update/?id=${orderId}`, payload);
                      
                      // Refresh orders from context to ensure data is up-to-date
                      await refetchOrders();
                      
                      setDetailsFormOrderId(null);
                      setDetailsForm({});
                      showModal('Success', 'Order details saved successfully!', 'success');
                    } catch (err: any) {
                      console.error('Failed to save details:', err);
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
