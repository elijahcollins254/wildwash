"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import {
  Package,
  Truck,
  Loader,
  CheckCircle,
  Clock,
  AlertCircle,
  Wind,
  Droplets,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  fetchOrders,
  setPage,
  setStatusFilter,
  setQuery,
  selectOrders,
  selectOrdersLoading,
  selectOrdersMeta,
  selectOrdersError,
  selectOrdersState,
} from "@/redux/features/orderSlice";

/**
 * Orders page (Next.js client component) — now using Redux slice
 *
 * Notes:
 * - The slice handles fetching and mapping backend -> frontend shape.
 * - This component keeps local UI state for the create form and "creating" toggle.
 */

type Order = {
  code: string;
  date?: string; // ISO
  created_at?: string; // ISO
  items: number;
  weightKg?: number | null;
  weight_kg?: number | null;
  package: string;
  price: string; // formatted for display
  price_display?: string | null;
  actual_price?: string | null; // price entered by staff
  status: "Received" | "Washing" | "Drying" | "Ready" | "Delivered" | "Cancelled";
  eta?: string | null;
  estimated_delivery?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;
  is_paid?: boolean;
};

const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

import RouteGuard from "../../components/RouteGuard";

// Move status mappings outside component to avoid recreation
const STATUS_ICONS = {
  'Received': Package,
  'Washing': Droplets,
  'Drying': Wind,
  'Ready': CheckCircle,
  'Delivered': CheckCircle,
  'Cancelled': AlertCircle,
  'requested': Package,
  'picked': Truck,
  'in_progress': Loader,
  'washed': Droplets,
  'ready': CheckCircle,
  'pending_assignment': Clock,
};

const STATUS_COLORS = {
  'Received': { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-l-4 border-l-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  'Washing': { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-l-4 border-l-purple-500', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  'Drying': { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  'Ready': { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-l-4 border-l-green-500', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  'Delivered': { bg: 'bg-slate-50 dark:bg-slate-800/20', border: 'border-l-4 border-l-slate-400', badge: 'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300' },
  'Cancelled': { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-l-4 border-l-red-500', badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  'requested': { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-l-4 border-l-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  'picked': { bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  'in_progress': { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-l-4 border-l-purple-500', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  'washed': { bg: 'bg-cyan-50 dark:bg-cyan-950/20', border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' },
  'ready': { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-l-4 border-l-green-500', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  'pending_assignment': { bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-l-4 border-l-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
};

export default function OrdersPage(): React.JSX.Element {

  const router = useRouter();
  const dispatch = useAppDispatch();

  // Redux state/selectors
  const orders = useAppSelector(selectOrders);
  const loading = useAppSelector(selectOrdersLoading);
  const meta = useAppSelector(selectOrdersMeta);
  const errorFromState = useAppSelector(selectOrdersError);
  const fullState = useAppSelector(selectOrdersState); // for createLoading, refreshCounter, etc.

  // Local UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProceedToCheckout = useCallback((orderCode: string) => {
    // Find the order in Redux state
    const order = orders.find(o => o.code === orderCode);
    if (!order) {
      setErrorMessage('Order not found');
      return;
    }

    // ONLY use actual_price - no fallback to estimate
    if (!order.actual_price) {
      setErrorMessage('This order does not have a final price set. Please contact staff to set the actual price before proceeding to checkout.');
      return;
    }

    const price = order.actual_price.toString().replace(/[^0-9.]/g, '');
    
    router.push(`/checkout?order_id=${encodeURIComponent(order.code)}&amount=${encodeURIComponent(price)}`);
  }, [orders, router]);

  // Local controlled search / filter bound to redux meta
  const query = meta.query;
  const statusFilter = meta.statusFilter; // "All" | Order['status']
  const page = meta.page;
  const pageSize = meta.pageSize;
  const totalPages = meta.totalPages ?? 1;

  // summary computed from current fetched orders
  const summary = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "Delivered").length;
    const active = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").length;
    return { total, completed, active };
  }, [orders]);

  // Memoize filtered orders to avoid recalculation
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = (query ?? "").trim().toLowerCase();
      if (!q) return true;
      return (
        (o.code ?? "").toLowerCase().includes(q) ||
        (o.package ?? "").toLowerCase().includes(q) ||
        (String(o.price ?? "").toLowerCase()).includes(q)
      );
    });
  }, [orders, query]);

  // Fetch when relevant meta changes (page, pageSize, statusFilter, query) or when refreshCounter increments
  useEffect(() => {
    setErrorMessage(null);
    dispatch(fetchOrders());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, pageSize, statusFilter, query, fullState.refreshCounter]);

  // sync error message from state
  useEffect(() => {
    if (errorFromState) setErrorMessage(errorFromState);
  }, [errorFromState]);

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Your orders</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">All orders for your account — view details, track progress or reorder.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/cart" className="rounded-full w-10 h-10 flex items-center justify-center bg-red-600 text-white text-lg shadow hover:bg-red-700">+</Link>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex gap-3">
            <input value={query ?? ''} onChange={(e) => dispatch(setQuery(e.target.value))} placeholder="Search by code, package or price" className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:border-transparent transition-all" />
            <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value as any))} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-red-300 dark:hover:border-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:border-transparent transition-all cursor-pointer appearance-none bg-[length:1.5em_1.5em] bg-no-repeat bg-right-4" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23ef4444'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
              paddingRight: '2.5rem'
            }}>
              <option value="All">All statuses</option>
              <option value="Received">Received</option>
              <option value="Washing">Washing</option>
              <option value="Drying">Drying</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow text-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Orders (page)</div>
              <div className="font-semibold text-lg">{orders.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Active</div>
              <div className="font-semibold text-lg text-red-600">{summary.active}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Completed</div>
              <div className="font-semibold text-lg">{summary.completed}</div>
            </div>
          </div>
        </section>

        <main>
          {loading ? (
            <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-8 shadow text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent mb-3"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading your orders…</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-900/20 p-12 shadow text-center border border-slate-200 dark:border-slate-700">
              <div className="text-6xl mb-3">📦</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No orders yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">You haven't placed any orders. Start by browsing our services.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/" className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                  Browse Services
                </Link>
                <Link href="/contact" className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Get Support
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((o) => (
                <OrderCard 
                  key={o.code} 
                  order={o} 
                  onCheckout={handleProceedToCheckout}
                />
              ))}
            </div>
          )}

          {/* pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button className="px-3 py-1 rounded border" onClick={() => dispatch(setPage(Math.max(1, page - 1)))} disabled={page === 1}>Prev</button>
              <div className="px-3 py-1">Page {page} of {totalPages}</div>
              <button className="px-3 py-1 rounded border" onClick={() => dispatch(setPage(Math.min(totalPages, page + 1)))} disabled={page === totalPages}>Next</button>
            </div>
          )}

          {errorMessage && <div className="mt-4 text-sm text-red-500">{errorMessage}</div>}
        </main>
      </div>
      </div>
    </RouteGuard>
  );
}

// Memoized OrderCard component to prevent unnecessary re-renders
const OrderCard = React.memo(({ order: o, onCheckout }: { order: Order; onCheckout: (code: string) => void }) => {
  const colors = STATUS_COLORS[o.status as keyof typeof STATUS_COLORS] || STATUS_COLORS['requested'];
  const IconComponent = STATUS_ICONS[o.status as keyof typeof STATUS_ICONS] || Package;
  const isPaid = o.is_paid ?? false;
  const orderDate = new Date(o.created_at || o.date || '');

  return (
    <article className={`rounded-xl ${colors.bg} ${colors.border} bg-white/80 dark:bg-white/5 p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
            <div>
              <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{o.code}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{orderDate.toLocaleDateString()} · {orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
            {o.status}
          </span>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {o.price ? (
              typeof o.price === 'string' && o.price.includes('KSh') 
                ? o.price 
                : `KSh ${Number(o.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ) : 'KSh 0.00'}
          </div>
          {isPaid && (
            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1 flex items-center justify-end gap-1">
              <CheckCircle className="w-3 h-3" /> Paid
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2.5">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Items</div>
          <div className="font-bold text-sm mt-1 text-slate-900 dark:text-slate-100">{o.items}</div>
        </div>

        {(o.weight_kg || o.weightKg) && (
          <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2.5">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Weight</div>
            <div className="font-bold text-sm mt-1 text-slate-900 dark:text-slate-100">{o.weight_kg || o.weightKg} kg</div>
          </div>
        )}

        {(o.estimated_delivery || o.eta) && (
          <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2.5">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">ETA</div>
            <div className="font-bold text-sm mt-1 text-slate-900 dark:text-slate-100">{o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString() : o.eta}</div>
          </div>
        )}
        
        <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2.5">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Package</div>
          <div className="font-bold text-sm mt-1 text-slate-900 dark:text-slate-100 truncate">{o.package}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link 
          href={`/orders/${o.code}`} 
          className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-slate-100 font-semibold text-sm text-center transition-all hover:shadow-sm">
          View Details
        </Link>
        {!isPaid && (
          <button 
            onClick={() => onCheckout(o.code)}
            className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm text-center transition-all hover:shadow-sm">
            Pay Now
          </button>
        )}
      </div>
    </article>
  );
});
