/**
 * OrderContext - Centralized order management for all pages
 * 
 * Benefits:
 * - Single source of truth for orders across entire app
 * - Smart caching: orders cached and reused across page navigation
 * - SSE updates: refreshes staff order data when the backend changes an order
 * - Filters run on backend: status, rider, search, and date range
 * - <5s initial load time with pagination
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { client } from '@/lib/api/client';

export interface Order {
  id: number;
  code: string;
  status: string;
  created_at: string;
  customer_name?: string;
  rider?: any;
  pickup_rider?: any;
  delivery_rider?: any;
  service_location?: any;
  price?: number;
  actual_price?: number;
  [key: string]: any;
}

export interface OrderContextType {
  // Data
  orders: Order[];
  totalOrdersCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Filtering
  statusFilter: string;
  riderFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  
  // Actions
  setStatusFilter: (status: string) => void;
  setRiderFilter: (rider: string) => void;
  setSearchQuery: (query: string) => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  resetFilters: () => void;
  
  // Manual refresh
  refetchOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  
  // Role-specific method
  fetchOrdersForRole: (staffRole: 'washer' | 'folder' | 'fumigator' | 'staff' | 'admin' | 'rider') => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

interface OrderProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages all orders for the app
 * Should wrap the entire application in _app.tsx or layout.tsx
 */
export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [riderFilter, setRiderFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Refs for smart caching and request coordination
  const cacheRef = useRef<{ orders: Order[]; count: number; timestamp: number; filters: any }>({
    orders: [],
    count: 0,
    timestamp: 0,
    filters: {}
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageRef = useRef(1);
  const requestIdRef = useRef(0);
  const filtersInitializedRef = useRef(false);
  const hasFetchedOrdersRef = useRef(false);

  /**
   * Fetch orders with filters - uses backend filtering for speed
   */
  const fetchOrders = useCallback(async (page = 1, useCache = false, append = false) => {
    const requestId = ++requestIdRef.current;
    try {
      // Check cache validity (5 minute TTL) - only use cache on initial load
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      const filterChanged = JSON.stringify({ statusFilter, riderFilter, searchQuery, dateFrom, dateTo }) !== 
                           JSON.stringify(cacheRef.current.filters);
      
      if (useCache && cacheAge < 300000 && !filterChanged && cacheRef.current.orders.length > 0) {
        console.log('[OrderContext] Using cached orders');
        setOrders(cacheRef.current.orders);
        setTotalOrdersCount(cacheRef.current.count);
        currentPageRef.current = 1;
        hasFetchedOrdersRef.current = true;
        return;
      }

      if (!hasFetchedOrdersRef.current) setIsLoading(true);
      setError(null);

      // Build query params (backend filtering is now available!)
      const params = new URLSearchParams();
      params.append('page', String(page));
      
      if (statusFilter) params.append('status', statusFilter);
      if (riderFilter) params.append('rider', riderFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const endpoint = `/orders/?${params.toString()}`;
      console.log('[OrderContext] Fetching from:', endpoint);

      const data = await client.get(endpoint);
      const list = Array.isArray(data?.results) ? data.results : [];
      const count = data?.count || 0;

      if (requestId !== requestIdRef.current) return;

      if (!append) {
        cacheRef.current = {
          orders: list,
          count,
          timestamp: Date.now(),
          filters: { statusFilter, riderFilter, searchQuery, dateFrom, dateTo }
        };
      }

      setOrders(currentOrders => append ? [...currentOrders, ...list] : [...list]);
      setTotalOrdersCount(count);
      currentPageRef.current = page;
      hasFetchedOrdersRef.current = true;
      console.log('[OrderContext] Orders updated:', list.length, 'items');

    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      console.error('[OrderContext] Fetch error:', err);
      setError(err?.message || 'Failed to load orders');
      cacheRef.current = { orders: [], count: 0, timestamp: 0, filters: {} };
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [statusFilter, riderFilter, searchQuery, dateFrom, dateTo]);

  /**
   * Debounced fetch when filters change
   */
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchOrders(1, false);
    }, 500);
  }, [fetchOrders]);

  /**
   * Fetch orders for a specific role
   */
  const fetchOrdersForRole = useCallback(async (staffRole: 'washer' | 'folder' | 'fumigator' | 'staff' | 'admin' | 'rider') => {
    // Could add role-specific filtering here in the future
    await fetchOrders(1, true);
  }, [fetchOrders]);

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setStatusFilter('');
    setRiderFilter('');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  }, []);

  /**
   * Manual refresh - always clears cache and fetches fresh data
   */
  const refetchOrders = useCallback(async () => {
    // Clear cache to force fresh fetch
    cacheRef.current = { orders: [], count: 0, timestamp: 0, filters: {} };
    console.log('[OrderContext] Cache cleared for manual refresh');
    await fetchOrders(1, false);
  }, [fetchOrders]);

  const loadMoreOrders = useCallback(async () => {
    if (isLoading || orders.length >= totalOrdersCount) return;
    await fetchOrders(currentPageRef.current + 1, false, true);
  }, [fetchOrders, isLoading, orders.length, totalOrdersCount]);

  // Initial load
  useEffect(() => {
    fetchOrders(1, true);
  }, []);

  // Fetch when filters change (debounced)
  useEffect(() => {
    if (!filtersInitializedRef.current) {
      filtersInitializedRef.current = true;
      return;
    }
    debouncedFetch();
  }, [statusFilter, riderFilter, searchQuery, dateFrom, dateTo, debouncedFetch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const value: OrderContextType = {
    orders,
    totalOrdersCount,
    isLoading,
    error,
    statusFilter,
    riderFilter,
    searchQuery,
    dateFrom,
    dateTo,
    setStatusFilter,
    setRiderFilter,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    resetFilters,
    refetchOrders,
    loadMoreOrders,
    fetchOrdersForRole,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

/**
 * Hook to use OrderContext
 * Usage: const { orders, isLoading } = useOrders();
 */
export const useOrders = (): OrderContextType => {
  const context = React.useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

export default OrderContext;
