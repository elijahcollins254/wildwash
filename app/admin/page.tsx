"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import RouteGuard from "@/components/RouteGuard";
import OrderStaffDetailsViewer from "@/components/OrderStaffDetailsViewer";
import { client } from "@/lib/api/client";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import {
  fetchOrders,
  fetchLocations,
  fetchUsers,
  fetchLoans,
  fetchTradeIns,
  fetchBNPL,
  fetchTransactions,
  setAdminApiClient,
} from "@/redux/features/adminSlice";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Users,
  Truck,
  CheckCircle,
  DollarSign,
  Loader2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Eye,
} from "lucide-react";

/* --- Types --- */
type RawOrder = Record<string, any>;
type RawLocation = Record<string, any>;
type RawUser = Record<string, any>;
type RawLoan = Record<string, any>;

type Order = {
  id?: number;
  code?: string;
  created_at?: string;
  price?: string | number;
  status?: string;
  rider?: string | null;
  raw?: RawOrder;
};

type RiderLocation = {
  id?: number;
  rider?: string | number | null;
  rider_display?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accuracy?: number | null;
  speed?: number | null;
  recorded_at?: string | null;
  raw?: RawLocation;
};

type User = {
  id?: number;
  username?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  location?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined?: string;
  created_at?: string;
  raw?: RawUser;
};

type LoanApplication = {
  id?: string;
  loan_type?: string;
  loan_amount?: string | number;
  duration_days?: number;
  purpose?: string;
  status?: string;
  total_repayment?: string | number;
  created_at?: string;
  approved_at?: string;
  order_code?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  guarantors?: Array<{
    id?: string;
    name?: string;
    phone_number?: string;
    email?: string;
  }>;
  raw?: RawLoan;
};

type TradeIn = {
  id?: number;
  user_id?: number;
  user_name?: string;
  user_phone?: string;
  description?: string;
  estimated_price?: string | number;
  contact_phone?: string;
  status?: string;
  created_at?: string;
  raw?: Record<string, any>;
};

type BNPLUser = {
  id?: number;
  user_id?: number;
  user_name?: string;
  user_phone?: string;
  is_enrolled?: boolean;
  is_active?: boolean;
  credit_limit?: string | number;
  current_balance?: string | number;
  created_at?: string;
  updated_at?: string;
  raw?: Record<string, any>;
};

/* --- Module-Level Constants --- */
const STATUS_COLORS: Record<string, string> = {
  'delivered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'default': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const TRANSACTION_STATUS_COLORS: Record<string, string> = {
  'success': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'initiated': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const LOAN_STATUS_COLORS: Record<string, string> = {
  'approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'default': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

/* --- Helper Functions --- */
function getStatusColorClass(status: string | undefined, colorMap: Record<string, string> = STATUS_COLORS): string {
  if (!status) return colorMap['default'];
  return colorMap[status] || colorMap['default'];
}

function getRiderNameHelper(rider: any): string {
  if (!rider) return '';
  if (typeof rider === 'string') return rider;
  if (typeof rider === 'number') return String(rider);
  if (typeof rider === 'object') {
    return rider.username || rider.first_name || rider.name || String(rider.id || '');
  }
  return '';
}

/* --- Component --- */
export default function AdminPage(): React.ReactElement {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const adminState = useSelector((state: RootState) => state.admin);
  const {
    orders,
    locations,
    users,
    loans,
    tradeIns,
    bnplUsers,
    transactions,
    ordersLoading,
    locationsLoading,
    usersLoading,
    loansLoading,
    tradeInsLoading,
    bnplLoading,
    transactionsLoading,
    ordersRefreshing,
    locationsRefreshing,
    usersRefreshing,
    loansRefreshing,
    tradeInsRefreshing,
    bnplRefreshing,
    transactionsRefreshing,
    ordersError,
    locationsError,
    usersError,
    loansError,
    tradeInsError,
    bnplError,
    transactionsError,
  } = adminState;

  // Local UI state
  const [activeTab, setActiveTab] = useState<'orders' | 'riders' | 'users' | 'loans' | 'tradeins' | 'bnpl' | 'transactions' | 'analytics'>('orders');
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersPageLoading, setOrdersPageLoading] = useState(false);
  const [reachedEndOfOrders, setReachedEndOfOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riderFilter, setRiderFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userJoinDateFilter, setUserJoinDateFilter] = useState<string>('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('');
  const [tradeInStatusFilter, setTradeInStatusFilter] = useState<string>('');
  const [bnplSearchQuery, setBnplSearchQuery] = useState<string>('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('');
  const [transactionProviderFilter, setTransactionProviderFilter] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [staffDetailsModalOpen, setStaffDetailsModalOpen] = useState(false);

  // User Management States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<User | null>(null);

  // Initialize Redux API client once
  useEffect(() => {
    setAdminApiClient(client);
  }, []);

  // Fetch orders page by page for infinite scroll
  const fetchOrdersPage = useCallback(async (page: number) => {
    try {
      setOrdersPageLoading(true);
      const data = await client.get(`/orders/?page=${page}`);
      const paginatedData = data;
      const list: any[] = Array.isArray(paginatedData?.results) ? paginatedData.results : [];
      const count = paginatedData?.count || 0;
      
      setTotalOrdersCount(count);
      
      // Transform with 'raw' property for admin compatibility
      const transformedOrders = list.map((order: any) => ({
        ...order,
        raw: order
      }));
      
      // Accumulate orders (avoid duplicates)
      setAllOrders((prev) => {
        if (page === 1) {
          return transformedOrders; // Reset on first page
        }
        const existingIds = new Set(prev.map(o => o.id));
        const newOrders = transformedOrders.filter(o => !existingIds.has(o.id));
        return [...prev, ...newOrders];
      });
      
      // Stop pagination if:
      // 1. This page returned fewer items than PAGE_SIZE (last page)
      // 2. This page returned 0 items (past the end)
      const PAGE_SIZE = 50;
      if (list.length < PAGE_SIZE) {
        setReachedEndOfOrders(true);
      }
      
      setOrdersPageLoading(false);
    } catch (err: any) {
      console.error('Error fetching orders page:', err);
      // Stop pagination when we encounter an error
      setReachedEndOfOrders(true);
      setOrdersPageLoading(false);
    }
  }, [allOrders.length]);

  // Check if there are more pages to load
  const PAGE_SIZE = 50;
  const maxPossiblePages = Math.ceil(totalOrdersCount / PAGE_SIZE);
  const hasMoreOrders = !reachedEndOfOrders && allOrders.length < totalOrdersCount && totalOrdersCount > 0 && ordersPage <= maxPossiblePages;

  // Infinite scroll trigger
  const scrollObserverTarget = useInfiniteScroll({
    onLoadMore: () => {
      // Only load next page if we haven't reached the end and aren't already loading
      if (hasMoreOrders && !ordersPageLoading && activeTab === 'orders') {
        setOrdersPage((prev) => prev + 1);
      }
    },
    hasMore: hasMoreOrders,
    isLoading: ordersPageLoading,
    threshold: 500,
  });

  // Fetch next page when ordersPage changes
  useEffect(() => {
    if (ordersPage > 0) {
      // Reset the end flag when fetching page 1 (fresh load)
      if (ordersPage === 1) {
        setReachedEndOfOrders(false);
      }
      fetchOrdersPage(ordersPage);
    }
  }, [ordersPage, fetchOrdersPage]);

  // Display orders: use paginated orders if available, fallback to Redux orders
  const displayOrders = allOrders.length > 0 ? allOrders : orders;

  // Helper function to calculate price from order_items with quantities
  const calculateOrderPrice = (order: any): number => {
    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      return order.order_items.reduce((total: number, item: any) => {
        const itemPrice = Number(item.service_price ?? 0);
        const quantity = Number(item.quantity ?? 1);
        return total + (itemPrice * quantity);
      }, 0);
    }
    return Number(order.total_price ?? order.price ?? order.price_display ?? 0);
  };

  // User Management Functions
  const updateUserDetails = useCallback(async (userId: number, data: any) => {
    setUserActionLoading(true);
    setUserActionError(null);
    try {
      await client.patch(`/users/users/${userId}/`, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone,
      });
      setUserActionSuccess('User details updated successfully');
      setEditModalOpen(false);
      dispatch(fetchUsers());
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message ?? 'Failed to update user');
    } finally {
      setUserActionLoading(false);
    }
  }, [dispatch]);

  const resetUserPassword = useCallback(async (userId: number, email: string) => {
    setUserActionLoading(true);
    setUserActionError(null);
    try {
      await client.post('/users/password-reset/', { email });
      setUserActionSuccess('Password reset email sent successfully');
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message ?? 'Failed to send password reset email');
    } finally {
      setUserActionLoading(false);
    }
  }, []);

  const changeUserRole = useCallback(async (userId: number, newRole: string) => {
    setUserActionLoading(true);
    setUserActionError(null);
    try {
      const payload: any = {};
      if (newRole === 'admin') {
        payload.is_superuser = true;
        payload.is_staff = true;
      } else if (newRole === 'staff') {
        payload.is_staff = true;
        payload.is_superuser = false;
      } else {
        payload.is_staff = false;
        payload.is_superuser = false;
        payload.role = newRole || 'customer';
      }
      await client.patch(`/users/users/${userId}/`, payload);
      setUserActionSuccess(`User role changed to ${newRole}`);
      dispatch(fetchUsers());
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message ?? 'Failed to change user role');
    } finally {
      setUserActionLoading(false);
    }
  }, [dispatch]);

  const toggleUserStatus = useCallback(async (userId: number, shouldDeactivate: boolean) => {
    setUserActionLoading(true);
    setUserActionError(null);
    try {
      await client.patch(`/users/users/${userId}/`, { is_active: !shouldDeactivate });
      setUserActionSuccess(shouldDeactivate ? 'User account suspended' : 'User account reactivated');
      dispatch(fetchUsers());
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message ?? 'Failed to change user status');
    } finally {
      setUserActionLoading(false);
    }
  }, [dispatch]);

  const fetchActivityLogs = useCallback(async (userId: number) => {
    try {
      const response = await client.get(`/users/users/${userId}/activity-logs/`);
      setActivityLogs(Array.isArray(response) ? response : response?.results ?? []);
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
      setActivityLogs([]);
    }
  }, []);

  const handleRiderAssignment = useCallback(async (orderId: number, riderId: number) => {
    try {
      await client.patch(`/orders/update/?id=${orderId}`, { rider: riderId });
      setUserActionSuccess('Rider assigned successfully');
      dispatch(fetchOrders());
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message ?? 'Failed to assign rider');
      setTimeout(() => setUserActionError(null), 3000);
    }
  }, [dispatch]);

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    setEditModalOpen(true);
  };

  // Track which tabs have been loaded to avoid re-fetching
  const loadedTabsRef = useRef<Set<string>>(new Set());

  // Initial data load - PARALLEL for optimal performance
  // Orders, Locations, and Users load simultaneously
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load ALL initial data in parallel (not sequential)
        await Promise.all([
          // Step 1: Load first page of orders (priority)
          fetchOrdersPage(1).then(() => {
            setOrdersPage(1);
            loadedTabsRef.current.add('orders');
          }),
          
          // Step 2: Load locations in parallel (for rider tracking)
          dispatch(fetchLocations()).unwrap().catch(() => {
            loadedTabsRef.current.add('riders');
          }),
          
          // Step 3: Load users in parallel (for rider assignment dropdown)
          dispatch(fetchUsers()).unwrap().catch(() => {
            loadedTabsRef.current.add('users');
          })
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };

    loadInitialData();
  }, [dispatch, fetchOrdersPage]);

  // Lazy load other tabs when clicked
  useEffect(() => {
    if (activeTab === 'loans' && !loadedTabsRef.current.has('loans')) {
      dispatch(fetchLoans());
      loadedTabsRef.current.add('loans');
    } else if (activeTab === 'tradeins' && !loadedTabsRef.current.has('tradeins')) {
      dispatch(fetchTradeIns());
      loadedTabsRef.current.add('tradeins');
    } else if (activeTab === 'bnpl' && !loadedTabsRef.current.has('bnpl')) {
      dispatch(fetchBNPL());
      loadedTabsRef.current.add('bnpl');
    } else if (activeTab === 'transactions' && !loadedTabsRef.current.has('transactions')) {
      dispatch(fetchTransactions());
      loadedTabsRef.current.add('transactions');
    }
    // 'analytics' tab uses existing orders data, no fetch needed
  }, [activeTab, dispatch]);

  // Derived metrics
  const totalOrders = totalOrdersCount || displayOrders.length;
  const completed = displayOrders.filter((o) => String(o.status ?? "").toLowerCase() === "delivered").length;
  const inProgress = displayOrders.filter((o) => String(o.status ?? "").toLowerCase() !== "delivered").length;
  const totalRevenue = displayOrders.reduce((sum, o) => {
    const price = Number(o.price ?? 0);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  // Latest location per rider (in case public endpoint returns multiple per rider)
  const latestLocationByRider = (() => {
    const map = new Map<string, RiderLocation>();
    for (const loc of locations) {
      const key = String(loc.rider ?? loc.rider_display ?? loc.id ?? Math.random());
      const existing = map.get(key);
      const tsExisting = existing ? new Date(existing.recorded_at ?? existing.raw?.created_at ?? 0).getTime() : 0;
      const tsNew = new Date(loc.recorded_at ?? loc.raw?.created_at ?? 0).getTime();
      if (!existing || tsNew >= tsExisting) map.set(key, loc);
    }
    return Array.from(map.entries()).map(([riderKey, loc]) => ({ riderKey, ...loc }));
  })();

  const riderCount = latestLocationByRider.length;

  // daily stats for charts
  const dailyStats = Object.values(
    displayOrders.reduce((acc: Record<string, { date: string; orders: number; revenue: number }>, o) => {
      const date = o.created_at?.split?.("T")?.[0] ?? new Date().toISOString().split("T")[0];
      if (!acc[date]) acc[date] = { date, orders: 0, revenue: 0 };
      acc[date].orders += 1;
      const price = Number(o.price ?? 0);
      acc[date].revenue += isNaN(price) ? 0 : price;
      return acc;
    }, {})
  );

  const refreshAll = async () => {
    // Reset orders to first page and refresh from API
    await fetchOrdersPage(1);
    setOrdersPage(1);
    dispatch(fetchLocations());
    dispatch(fetchUsers());
    dispatch(fetchLoans());
    dispatch(fetchTradeIns());
    dispatch(fetchBNPL());
    dispatch(fetchTransactions());
  };

  // filter helpers
  const getRiderName = useCallback((rider: any): string => {
    return getRiderNameHelper(rider);
  }, []);

  const availableStatuses = Array.from(new Set(displayOrders.map(o => (o.status ?? '').toString()))).filter(Boolean);
  const availableRiders = Array.from(new Set(displayOrders.map(o => getRiderName(o.rider)))).filter(Boolean);
  const availableLocations = Array.from(new Set(displayOrders.map(o => (o.raw?.user?.location || '').toString()))).filter(Boolean);

  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          start: weekStart.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        };
      case 'custom':
        return {
          start: startDate,
          end: endDate
        };
      default:
        return { start: '', end: '' };
    }
  }, [dateFilter, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    return displayOrders.filter(o => {
      if (statusFilter && String(o.status ?? '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (riderFilter && getRiderName(o.rider).toLowerCase() !== riderFilter.toLowerCase()) return false;
      if (locationFilter) {
        const customerLocation = (o.raw?.user?.location || '').toLowerCase();
        if (customerLocation !== locationFilter.toLowerCase()) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCode = String(o.code ?? '').toLowerCase().includes(q);
        const matchesRider = getRiderName(o.rider).toLowerCase().includes(q);
        if (!matchesCode && !matchesRider) return false;
      }

      // Date filtering
      const { start, end } = getDateRange();
      if (start && end) {
        const orderDate = o.created_at?.split('T')[0];
        if (!orderDate || orderDate < start || orderDate > end) return false;
      }

      return true;
    });
  }, [displayOrders, statusFilter, riderFilter, locationFilter, searchQuery, dateFilter, startDate, endDate, getRiderName, getDateRange]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search by username, email, or name
      if (userSearchQuery) {
        const q = userSearchQuery.toLowerCase();
        const matchesUsername = String(u.username ?? '').toLowerCase().includes(q);
        const matchesEmail = String(u.email ?? '').toLowerCase().includes(q);
        const matchesName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q);
        if (!matchesUsername && !matchesEmail && !matchesName) return false;
      }

      // Filter by role
      if (userRoleFilter) {
        if (userRoleFilter === 'admin' && !u.is_superuser) return false;
        if (userRoleFilter === 'staff' && (!u.is_staff || u.is_superuser)) return false;
        if (userRoleFilter === 'user' && (u.is_staff || u.is_superuser)) return false;
      }

      // Filter by join date
      if (userJoinDateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const userJoinDate = new Date(u.date_joined ?? '');
        userJoinDate.setHours(0, 0, 0, 0);

        switch (userJoinDateFilter) {
          case 'today':
            if (userJoinDate.getTime() !== today.getTime()) return false;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            if (userJoinDate.getTime() < weekAgo.getTime()) return false;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            if (userJoinDate.getTime() < monthAgo.getTime()) return false;
            break;
        }
      }

      return true;
    });
  }, [users, userSearchQuery, userRoleFilter, userJoinDateFilter]);

  // Compute body JSX separately to avoid complex inline nested ternaries in JSX
  const body = (() => {
    // Show error state only if there's an actual error (not loading)
    if ((ordersError || locationsError) && !ordersLoading && !locationsLoading) {
      return (
        <div className="py-8">
          {ordersError && <div className="mb-2 text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Orders error: {ordersError}</div>}
          {locationsError && <div className="text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Riders error: {locationsError}</div>}
        </div>
      );
    }

    return (
      <div>
        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('riders')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'riders'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Riders
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'users'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'loans'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Loans
          </button>
          <button
            onClick={() => setActiveTab('tradeins')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'tradeins'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Trade-Ins
          </button>
          <button
            onClick={() => setActiveTab('bnpl')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'bnpl'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            BNPL
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Summary - Only show for Orders tab */}
        {activeTab === 'orders' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={<Users />} label="Total Orders" value={String(totalOrders)} />
          <StatCard icon={<Loader2 />} label="In Progress" value={String(inProgress)} />
          <StatCard icon={<CheckCircle />} label="Completed" value={String(completed)} />
          <StatCard icon={<DollarSign />} label="Revenue" value={`KSh ${totalRevenue.toLocaleString()}`} />
          <StatCard icon={<Truck />} label="Active Riders" value={String(new Set(orders.map(o => o.rider)).size)} />
          <StatCard icon={<Users />} label="Total Users" value={String(users.length)} />
        </div>
        )}

        {/* Recent Orders - Orders Tab */}
        {activeTab === 'orders' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Recent Orders</h2>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All statuses</option>
                  {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <select 
                  value={riderFilter} 
                  onChange={(e) => setRiderFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All riders</option>
                  {availableRiders.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={locationFilter} 
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All locations</option>
                  {availableLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search code or rider" 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value as any)} 
                  className="rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="week">Last 7 days</option>
                  <option value="today">Today</option>
                  <option value="month">Last 30 days</option>
                  <option value="custom">Custom range</option>
                </select>

                {dateFilter === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </>
                )}
              </div>

              <button 
                onClick={() => { 
                  setStatusFilter(''); 
                  setRiderFilter(''); 
                  setLocationFilter('');
                  setSearchQuery(''); 
                  setDateFilter('week');
                  setStartDate('');
                  setEndDate('');
                }} 
                className="text-sm px-3 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors duration-200 flex items-center gap-2 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-once">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                </svg>
                Reset all filters
              </button>
            </div>

            {/* Show skeleton loader while orders are loading and no orders are displayed yet */}
            {ordersLoading && allOrders.length === 0 && (
              <div className="space-y-3">
                <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            )}

            {/* Show table when orders are loaded or loading is done */}
            {!ordersLoading || allOrders.length > 0 ? (
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <table className="min-w-full text-sm divide-y divide-slate-200/50 dark:divide-slate-800/50">
                <thead className="sticky top-0 text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">User Name</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Location</th>
                    <th className="text-left py-3 px-4 font-medium">Rider</th>
                    <th className="text-right py-3 px-4 font-medium">Price (KSh)</th>
                    <th className="text-right py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {filteredOrders.slice(0, 100).map((o) => (
                    <tr key={o.id ?? o.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                      <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                        <Link href={`/admin/order/${o.code}`} className="hover:underline">
                          {o.code}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{o.raw?.user?.first_name && o.raw?.user?.last_name ? `${o.raw.user.first_name} ${o.raw.user.last_name}` : o.raw?.user?.username || "—"}</td>
                      <td className="py-3 px-4">{o.raw?.user?.phone || "—"}</td>
                      <td className="py-3 px-4">{o.raw?.user?.location || "—"}</td>
                      <td className="py-3 px-4">
                        {o.rider ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{getRiderName(o.rider)}</span>
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          </div>
                        ) : (o.status === 'requested' || o.status === 'pending_assignment') ? (
                          <InlineAssignRiderButton order={o} users={users} onAssign={handleRiderAssignment} />
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {isNaN(Number(o.price)) || o.price === null || o.price === undefined 
                          ? '—' 
                          : Number(o.price).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">{o.created_at?.split?.("T")?.[0] ?? "—"}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedOrderForDetails(o);
                            setStaffDetailsModalOpen(true);
                          }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          title="View staff input details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="8" y1="15" x2="16" y2="15"/>
                            <line x1="9" y1="9" x2="9.01" y2="9"/>
                            <line x1="15" y1="9" x2="15.01" y2="9"/>
                          </svg>
                          <span>No orders found</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            ) : null}

            {/* Infinite scroll loader trigger */}
            {hasMoreOrders && !ordersPageLoading && (
              <div ref={scrollObserverTarget} className="h-10 mt-8" />
            )}

            {/* Loading indicator when fetching more */}
            {ordersPageLoading && ordersPage > 1 && (
              <div className="flex justify-center py-8">
                <div className="animate-spin">
                  <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-red-600 rounded-full" />
                </div>
              </div>
            )}

            {/* All loaded indicator */}
            {!hasMoreOrders && displayOrders.length > 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  ✓ Loaded {displayOrders.length} of {totalOrdersCount} orders
                </p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Recent Transactions - Transactions Tab */}
        {activeTab === 'transactions' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Recent Transactions</h2>

            {transactionsError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {transactionsError}
              </div>
            )}

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={transactionStatusFilter}
                  onChange={(e) => setTransactionStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All statuses</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="initiated">Initiated</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <select
                  value={transactionProviderFilter}
                  onChange={(e) => setTransactionProviderFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All providers</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setTransactionStatusFilter('');
                  setTransactionProviderFilter('');
                  dispatch(fetchTransactions());
                }}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-600 transition-all font-medium text-sm"
              >
                Reset
              </button>
            </div>

            {transactionsLoading && !transactionsRefreshing ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-red-600 w-6 h-6" />
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 relative">
                {transactionsRefreshing && (
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-start justify-center pt-2">
                    <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 opacity-75">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Refreshing...
                    </div>
                  </div>
                )}
                <table className="min-w-full text-sm divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  <thead className="text-slate-600 dark:text-slate-400 sticky top-0 bg-white/50 dark:bg-slate-900/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">ID</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Phone</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-center py-3 px-4 font-medium">Provider</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                    {transactions
                      .filter(t => {
                        if (transactionStatusFilter && t.status !== transactionStatusFilter) return false;
                        if (transactionProviderFilter && t.provider !== transactionProviderFilter) return false;
                        return true;
                      })
                      .slice(0, 100)
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{t.id}</td>
                          <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">{t.user_name || '—'}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{t.user_phone}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                            {t.currency} {Number(t.amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                              {t.provider}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(t.status, TRANSACTION_STATUS_COLORS)}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    {transactions.filter(t => {
                      if (transactionStatusFilter && t.status !== transactionStatusFilter) return false;
                      if (transactionProviderFilter && t.provider !== transactionProviderFilter) return false;
                      return true;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <DollarSign className="w-6 h-6" />
                            <span>No transactions found</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Charts and Statistics - Analytics Tab */}
        {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Orders per Day Chart */}
          <ChartCard title="Orders per Day">
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          {/* Rider Order Statistics */}
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Rider Statistics</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left py-3 px-4">Rider</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-center py-3 px-4">Total Orders</th>
                    <th className="text-center py-3 px-4">Completed</th>
                    <th className="text-center py-3 px-4">In Progress</th>
                    <th className="text-center py-3 px-4">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {availableRiders.map((rider) => {
                    const riderOrders = orders.filter(o => String(o.rider) === rider);
                    const completed = riderOrders.filter(o => String(o.status).toLowerCase() === 'delivered').length;
                    const inProgress = riderOrders.filter(o => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase())).length;
                    const total = riderOrders.length;
                    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
                    
                    return (
                      <tr key={rider} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium">{rider}</td>
                        <td className="py-3 px-4">{riderOrders[0]?.raw?.rider?.service_location?.name || "—"}</td>
                        <td className="py-3 px-4 text-center">{total}</td>
                        <td className="py-3 px-4 text-center text-green-600">{completed}</td>
                        <td className="py-3 px-4 text-center text-blue-600">{inProgress}</td>
                        <td className="py-3 px-4 text-center font-medium">{successRate}%</td>
                      </tr>
                    );
                  })}
                  {availableRiders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">No riders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Loan Applications - Loans Tab */}
        {activeTab === 'loans' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Loan Applications</h2>
            
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={loanStatusFilter} 
                  onChange={(e) => setLoanStatusFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="repaid">Repaid</option>
                  <option value="rejected">Rejected</option>
                  <option value="defaulted">Defaulted</option>
                </select>
              </div>

              <button 
                onClick={() => { 
                  setLoanStatusFilter('');
                  fetchLoans();
                }} 
                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400 dark:hover:bg-slate-600 transition-all font-medium text-sm"
              >
                Clear Filters
              </button>
            </div>

            {loansLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-red-600 w-6 h-6" />
              </div>
            ) : loansError ? (
              <div className="p-4 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {loansError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Repayment</th>
                      <th className="text-center py-3 px-4">Duration</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Purpose</th>
                      <th className="text-left py-3 px-4">Guarantors</th>
                      <th className="text-left py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.filter(l => !loanStatusFilter || String(l.status).toLowerCase() === loanStatusFilter.toLowerCase()).map((loan) => (
                      <tr key={loan.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="font-mono text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline cursor-pointer transition-all"
                          >
                            {String(loan.id).substring(0, 12)}...
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <p className="font-medium text-slate-900 dark:text-white text-xs">{loan.user_name || "Unknown"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{loan.user_email || "—"}</p>
                            {loan.user_phone && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{loan.user_phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                            {loan.loan_type === 'order_collateral' ? 'Order' : 'Asset'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          KSh {Number(loan.loan_amount ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          KSh {Number(loan.total_repayment ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">{loan.duration_days}d</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            loan.status === 'pending' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            loan.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            loan.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            loan.status === 'repaid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            loan.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            loan.status === 'defaulted' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}>
                            {String(loan.status).charAt(0).toUpperCase() + String(loan.status).slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">{loan.purpose}</td>
                        <td className="py-3 px-4 text-center">{loan.guarantors?.length ?? 0}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Loan Details Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Loan Application Details</h2>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Applicant Information */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-3">Applicant Information</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Name</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedLoan.user_name || "Unknown User"}</p>
                    </div>
                    {selectedLoan.user_email && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">Email</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 break-all">{selectedLoan.user_email}</p>
                      </div>
                    )}
                    {selectedLoan.user_phone && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">Phone</p>
                        <p className="text-sm text-slate-900 dark:text-white">{selectedLoan.user_phone}</p>
                      </div>
                    )}
                    {selectedLoan.user_id && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">User ID</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400">{selectedLoan.user_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loan ID and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Loan ID</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{selectedLoan.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      selectedLoan.status === 'pending' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      selectedLoan.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      selectedLoan.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      selectedLoan.status === 'repaid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      selectedLoan.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      selectedLoan.status === 'defaulted' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                    }`}>
                      {String(selectedLoan.status).charAt(0).toUpperCase() + String(selectedLoan.status).slice(1)}
                    </span>
                  </div>
                </div>

                {/* Loan Type and Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Loan Type</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedLoan.loan_type === 'order_collateral' ? 'Order Collateral' : 'Asset Collateral'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Loan Amount</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      KSh {Number(selectedLoan.loan_amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Repayment Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Total Repayment</p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      KSh {Number(selectedLoan.total_repayment ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Duration</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedLoan.duration_days} days
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Interest</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      KSh {(Number(selectedLoan.total_repayment ?? 0) - Number(selectedLoan.loan_amount ?? 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Purpose</p>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{selectedLoan.purpose}</p>
                  </div>
                </div>

                {/* Collateral Information */}
                {selectedLoan.loan_type === 'order_collateral' && selectedLoan.order_code && (
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Order Collateral</p>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-mono font-semibold text-blue-900 dark:text-blue-200">{selectedLoan.order_code}</p>
                    </div>
                  </div>
                )}

                {/* Guarantors */}
                {selectedLoan.guarantors && selectedLoan.guarantors.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-3">
                      Guarantor{selectedLoan.guarantors.length !== 1 ? 's' : ''} ({selectedLoan.guarantors.length})
                    </p>
                    <div className="space-y-2">
                      {selectedLoan.guarantors.map((guarantor, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-2 border-red-500">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{guarantor.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            📧 {guarantor.email}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            📞 {guarantor.phone_number}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Created</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedLoan.created_at ? new Date(selectedLoan.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  {selectedLoan.approved_at && (
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Approved</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {new Date(selectedLoan.approved_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-all font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Riders Section - Riders Tab */}
        {activeTab === 'riders' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Rider Statistics</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left py-3 px-4">Rider</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-center py-3 px-4">Total Orders</th>
                    <th className="text-center py-3 px-4">Completed</th>
                    <th className="text-center py-3 px-4">In Progress</th>
                    <th className="text-center py-3 px-4">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {availableRiders.map((rider) => {
                    const riderOrders = orders.filter(o => String(o.rider) === rider);
                    const completed = riderOrders.filter(o => String(o.status).toLowerCase() === 'delivered').length;
                    const inProgress = riderOrders.filter(o => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase())).length;
                    const total = riderOrders.length;
                    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
                    
                    // Safely get location name from nested service_location
                    const getLocationName = () => {
                      const svcLoc = riderOrders[0]?.raw?.rider?.service_location;
                      if (!svcLoc) return '—';
                      if (typeof svcLoc === 'string') return svcLoc;
                      if (typeof svcLoc === 'object' && svcLoc?.name) return String(svcLoc.name);
                      return '—';
                    };
                    
                    return (
                      <tr key={rider} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium">{rider}</td>
                        <td className="py-3 px-4">{getLocationName()}</td>
                        <td className="py-3 px-4 text-center">{total}</td>
                        <td className="py-3 px-4 text-center text-green-600">{completed}</td>
                        <td className="py-3 px-4 text-center text-blue-600">{inProgress}</td>
                        <td className="py-3 px-4 text-center font-medium">{successRate}%</td>
                      </tr>
                    );
                  })}
                  {availableRiders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No riders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Users Section - Users Tab */}
        {activeTab === 'users' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Registered Users</h2>
            
            {usersError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {usersError}
              </div>
            )}

            {/* User Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input 
                  value={userSearchQuery} 
                  onChange={(e) => setUserSearchQuery(e.target.value)} 
                  placeholder="Search by username, email, or name" 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <select 
                  value={userRoleFilter} 
                  onChange={(e) => setUserRoleFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <select 
                  value={userJoinDateFilter} 
                  onChange={(e) => setUserJoinDateFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All join dates</option>
                  <option value="today">Joined Today</option>
                  <option value="week">Joined This Week</option>
                  <option value="month">Joined This Month</option>
                </select>
              </div>

              <button 
                onClick={() => { 
                  setUserSearchQuery('');
                  setUserRoleFilter('');
                  setUserJoinDateFilter('');
                }} 
                className="text-sm px-3 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors duration-200 flex items-center gap-2 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-once">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                </svg>
                Reset
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <table className="min-w-full text-sm divide-y divide-slate-200/50 dark:divide-slate-800/50">
                <thead className="text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Username</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-center py-3 px-4 font-medium">Role</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Joined</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {filteredUsers.slice(0, 50).map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                      <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">{u.username}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{u.phone || u.phone_number || u.email || "—"}</td>
                      <td className="py-3 px-4">{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex gap-1">
                          {u.is_superuser && <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Admin</span>}
                          {u.is_staff && !u.is_superuser && <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Staff</span>}
                          {!u.is_staff && !u.is_superuser && u.role && <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 capitalize">{u.role}</span>}
                          {!u.is_staff && !u.is_superuser && !u.role && <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">User</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${u.raw?.is_active !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {u.raw?.is_active !== false ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">{(u.created_at || u.date_joined)?.split?.("T")?.[0] ?? "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            title="Edit user"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => resetUserPassword(u.id!, u.email!)}
                            disabled={userActionLoading}
                            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                            title="Reset password"
                          >
                            Reset Pwd
                          </button>
                          <div className="relative group">
                            <button
                              className="px-2 py-1 text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              title="Change role"
                            >
                              Role ▼
                            </button>
                            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hidden group-hover:block z-10">
                              <button onClick={() => changeUserRole(u.id!, 'admin')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700">Make Admin</button>
                              <button onClick={() => changeUserRole(u.id!, 'staff')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700">Make Staff</button>
                              <button onClick={() => changeUserRole(u.id!, 'customer')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700">Make Customer</button>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleUserStatus(u.id!, u.raw?.is_active !== false)}
                            disabled={userActionLoading}
                            className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                              u.raw?.is_active !== false
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                            }`}
                            title={u.raw?.is_active !== false ? 'Suspend account' : 'Activate account'}
                          >
                            {u.raw?.is_active !== false ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForLogs(u);
                              fetchActivityLogs(u.id!);
                            }}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            title="View activity logs"
                          >
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="8" y1="15" x2="16" y2="15"/>
                            <line x1="9" y1="9" x2="9.01" y2="9"/>
                            <line x1="15" y1="9" x2="15.01" y2="9"/>
                          </svg>
                          <span>No users found</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Edit User Modal */}
        {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Edit User Details</h3>
            
            {userActionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {userActionError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateUserDetails(selectedUser.id!, editFormData)}
                disabled={userActionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {userActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Activity Logs Modal */}
        {selectedUserForLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Activity Logs for {selectedUserForLogs.username}</h3>
              <button
                onClick={() => {
                  setSelectedUserForLogs(null);
                  setActivityLogs([]);
                }}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-900 dark:text-white">{log.action || 'Activity'}</p>
                      <span className="text-xs text-slate-500">{log.timestamp?.split('T')[0]}</span>
                    </div>
                    {log.details && <p className="text-sm text-slate-600 dark:text-slate-400">{log.details}</p>}
                    {log.ip_address && <p className="text-xs text-slate-500 mt-1">IP: {log.ip_address}</p>}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setSelectedUserForLogs(null);
                setActivityLogs([]);
              }}
              className="w-full mt-4 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        )}

        {/* Success Message Toast */}
        {userActionSuccess && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2 animate-pulse">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
          </svg>
          {userActionSuccess}
        </div>
        )}

        {/* Trade-Ins Section - Trade-Ins Tab */}
        {activeTab === 'tradeins' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Trade-In Submissions</h2>
            
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={tradeInStatusFilter} 
                  onChange={(e) => setTradeInStatusFilter(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <button 
                onClick={() => { 
                  setTradeInStatusFilter('');
                  fetchTradeIns();
                }} 
                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400 dark:hover:bg-slate-600 transition-all font-medium text-sm"
                           >
                Clear Filters
              </button>
            </div>

            {tradeInsLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-red-600 w-6 h-6" />
              </div>
            ) : tradeInsError ? (
              <div className="p-4 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {tradeInsError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Contact Phone</th>
                      <th className="text-left py-3 px-4">Item Description</th>
                      <th className="text-right py-3 px-4">Estimated Price</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeIns.filter(t => !tradeInStatusFilter || String(t.status).toLowerCase() === tradeInStatusFilter.toLowerCase()).map((trade) => (
                      <tr key={trade.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{trade.id}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <p className="font-medium text-slate-900 dark:text-white">{trade.user_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{trade.user_phone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{trade.contact_phone || "—"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{trade.description || "—"}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          KSh {Number(trade.estimated_price ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            trade.status === 'pending' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            trade.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            trade.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}>
                            {String(trade.status).charAt(0).toUpperCase() + String(trade.status).slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {trade.created_at ? new Date(trade.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* BNPL Users Section - BNPL Tab */}
        {activeTab === 'bnpl' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">BNPL Users</h2>
            
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input 
                  value={bnplSearchQuery} 
                  onChange={(e) => setBnplSearchQuery(e.target.value)} 
                  placeholder="Search by username or phone" 
                  className="w-full rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-sm transition-shadow duration-200 hover:bg-white dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                />
              </div>

              <button 
                onClick={() => { 
                  setBnplSearchQuery('');
                  fetchBNPL();
                }} 
                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400 dark:hover:bg-slate-600 transition-all font-medium text-sm"
              >
                Clear Filters
              </button>
            </div>

            {bnplLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-red-600 w-6 h-6" />
              </div>
            ) : bnplError ? (
              <div className="p-4 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {bnplError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-center py-3 px-4">Enrolled</th>
                      <th className="text-center py-3 px-4">Active</th>
                      <th className="text-right py-3 px-4">Credit Limit</th>
                      <th className="text-right py-3 px-4">Current Balance</th>
                      <th className="text-right py-3 px-4">Available Credit</th>
                      <th className="text-left py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bnplUsers.filter(b => {
                      if (bnplSearchQuery) {
                        const q = bnplSearchQuery.toLowerCase();
                        return String(b.user_name ?? '').toLowerCase().includes(q) || String(b.user_phone ?? '').toLowerCase().includes(q);
                      }
                      return true;
                    }).map((bnpl) => {
                      const availableCredit = Number(bnpl.credit_limit ?? 0) - Number(bnpl.current_balance ?? 0);
                      return (
                        <tr key={bnpl.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{bnpl.user_name}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{bnpl.user_phone || "—"}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${bnpl.is_enrolled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                              {bnpl.is_enrolled ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${bnpl.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                              {bnpl.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                            KSh {Number(bnpl.credit_limit ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                            KSh {Number(bnpl.current_balance ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                            KSh {availableCredit.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {bnpl.created_at ? new Date(bnpl.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  })();

  return (
    <RouteGuard requireAdmin>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">Admin</h1>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={refreshAll}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm bg-white/90 dark:bg-white/5"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </header>

          {body}
        </div>
      </div>

      {/* Staff Details Viewer Modal */}
      {selectedOrderForDetails && (
        <OrderStaffDetailsViewer
          orderId={selectedOrderForDetails.id!}
          orderCode={selectedOrderForDetails.code}
          isOpen={staffDetailsModalOpen}
          onClose={() => {
            setStaffDetailsModalOpen(false);
            setSelectedOrderForDetails(null);
          }}
        />
      )}
    </RouteGuard>
  );
}



/* --- Helpers & small components --- */
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

function latestTimeSummary(arr: Array<any>) {
  if (!arr || arr.length === 0) return "No data";
  const times = arr
    .map((r) => new Date(r.recorded_at ?? r.created_at ?? 0).getTime())
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (times.length === 0) return "No timestamps";
  const latest = new Date(times[0]);
  return `Latest ${latest.toLocaleString()}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-1 sm:gap-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
      <div className="flex items-center gap-1.5 text-red-600">
        <span className="w-4 h-4 sm:w-5 sm:h-5">{icon}</span>
        <span className="font-medium text-slate-600 dark:text-slate-300 text-xs sm:text-sm truncate">{label}</span>
      </div>
      <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">{title}</h2>
      <div className="transition-transform duration-300 hover:scale-[1.02]">
        <ResponsiveContainer width="100%" height={250}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AssignRiderButton({ order, users, onAssign }: { order: Order; users: User[]; onAssign: (orderId: number, riderId: number) => void }) {
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter riders: by role='rider', or by is_staff=true (fallback for older data)
  // Only include if is_active is not explicitly false (allow null/undefined as active)
  const availableRiders = users.filter(u => 
    (u.role === 'rider' || (u.is_staff && u.role !== 'customer')) && 
    u.is_active !== false
  );

  const handleAssign = async () => {
    if (!selectedRider) return;
    setIsAssigning(true);
    try {
      await onAssign(order.id!, parseInt(selectedRider));
      setSelectedRider('');
    } finally {
      setIsAssigning(false);
    }
  };

  if (availableRiders.length === 0) {
    return <span className="text-xs text-slate-400">No riders</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedRider}
        onChange={(e) => setSelectedRider(e.target.value)}
        className="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1"
        disabled={isAssigning}
      >
        <option value="">Select Rider</option>
        {availableRiders.map(rider => (
          <option key={rider.id} value={rider.id}>
            {rider.first_name && rider.last_name ? `${rider.first_name} ${rider.last_name}` : rider.username}
          </option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={!selectedRider || isAssigning}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAssigning ? '...' : 'Assign'}
      </button>
    </div>
  );
}

// Inline variant for Rider column - shows dropdown directly in table cell
function InlineAssignRiderButton({ order, users, onAssign }: { order: Order; users: User[]; onAssign: (orderId: number, riderId: number) => void }) {
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter riders: by role='rider', or by is_staff=true (fallback for older data)
  // Only include if is_active is not explicitly false (allow null/undefined as active)
  const availableRiders = users.filter(u => 
    (u.role === 'rider' || (u.is_staff && u.role !== 'customer')) && 
    u.is_active !== false
  );

  // Debug: Log available riders
  if (availableRiders.length === 0 && users.length > 0) {
    console.log('No riders found. Total users:', users.length, 'Sample users:', users.slice(0, 3).map(u => ({ id: u.id, name: u.username, role: u.role, is_staff: u.is_staff })));
  }

  const handleConfirm = async () => {
    if (!selectedRider) return;

    setIsAssigning(true);
    try {
      await onAssign(order.id!, parseInt(selectedRider));
      setSelectedRider('');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancel = () => {
    setSelectedRider('');
  };

  if (availableRiders.length === 0) {
    return <span className="text-slate-400 text-sm italic">No riders available</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedRider}
        onChange={(e) => setSelectedRider(e.target.value)}
        disabled={isAssigning}
        className="text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
      >
        <option value="">Select rider...</option>
        {availableRiders.map(rider => (
          <option key={rider.id} value={rider.id}>
            {rider.first_name && rider.last_name ? `${rider.first_name} ${rider.last_name}` : rider.username}
          </option>
        ))}
      </select>
      
      {selectedRider && (
        <>
          <button
            onClick={handleConfirm}
            disabled={isAssigning}
            className="px-2 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            title="Confirm assignment"
          >
            {isAssigning ? '...' : '✓'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isAssigning}
            className="px-2 py-1.5 text-sm bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Cancel"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

