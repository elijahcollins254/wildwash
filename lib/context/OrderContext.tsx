/**
 * OrderContext - Centralized order management for all pages
 * 
 * Benefits:
 * - Single source of truth for orders across entire app
 * - Smart caching: orders cached and reused across page navigation
 * - Background polling: keeps data fresh without user interaction
 * - Filters run on backend: status, rider, search parameters
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
  
  // Actions
  setStatusFilter: (status: string) => void;
  setRiderFilter: (rider: string) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  
  // Manual refresh
  refetchOrders: () => Promise<void>;
  
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
  
  // Refs for smart caching and polling
  const cacheRef = useRef<{ orders: Order[]; timestamp: number; filters: any }>({
    orders: [],
    timestamp: 0,
    filters: {}
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  /**
   * Fetch orders with filters - uses backend filtering for speed
   */
  const fetchOrders = useCallback(async (page = 1, useCache = false) => {
    try {
      // Check cache validity (5 minute TTL) - only use cache on initial load
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      const filterChanged = JSON.stringify({ statusFilter, riderFilter, searchQuery }) !== 
                           JSON.stringify(cacheRef.current.filters);
      
      if (useCache && cacheAge < 300000 && !filterChanged && cacheRef.current.orders.length > 0) {
        console.log('[OrderContext] Using cached orders');
        setOrders(cacheRef.current.orders);
        setTotalOrdersCount(cacheRef.current.orders.length);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Build query params (backend filtering is now available!)
      const params = new URLSearchParams();
      params.append('page', String(page));
      
      if (statusFilter) params.append('status', statusFilter);
      if (riderFilter) params.append('rider', riderFilter);
      if (searchQuery) params.append('search', searchQuery);

      const endpoint = `/orders/?${params.toString()}`;
      console.log('[OrderContext] Fetching from:', endpoint);

      // Small delay to allow backend to process recent changes
      await new Promise(resolve => setTimeout(resolve, 150));

      const data = await client.get(endpoint);
      const list = Array.isArray(data?.results) ? data.results : [];
      const count = data?.count || 0;

      // Cache the results
      cacheRef.current = {
        orders: list,
        timestamp: Date.now(),
        filters: { statusFilter, riderFilter, searchQuery }
      };

      // Force state update with new orders
      setOrders([...list]); // Spread ensures a new array reference for React
      setTotalOrdersCount(count);
      lastFetchTimeRef.current = Date.now();
      
      console.log('[OrderContext] Orders updated:', list.length, 'items');

    } catch (err: any) {
      console.error('[OrderContext] Fetch error:', err);
      setError(err?.message || 'Failed to load orders');
      // Clear cache on error to force fresh fetch next time
      cacheRef.current = { orders: [], timestamp: 0, filters: {} };
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, riderFilter, searchQuery]);

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
  }, []);

  /**
   * Manual refresh - always clears cache and fetches fresh data
   */
  const refetchOrders = useCallback(async () => {
    // Clear cache to force fresh fetch
    cacheRef.current = { orders: [], timestamp: 0, filters: {} };
    console.log('[OrderContext] Cache cleared for manual refresh');
    await fetchOrders(1, false);
  }, [fetchOrders]);

  // Initial load
  useEffect(() => {
    fetchOrders(1, true);
  }, []);

  // Fetch when filters change (debounced)
  useEffect(() => {
    debouncedFetch();
  }, [statusFilter, riderFilter, searchQuery, debouncedFetch]);

  // Background polling: refresh every 2 minutes
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      // Only poll if it's been at least 30 seconds since last manual fetch
      if (timeSinceLastFetch > 30000) {
        console.log('[OrderContext] Background poll triggered');
        fetchOrders(1, false);
      }
    }, 120000); // 2 minutes

    pollingIntervalRef.current = pollInterval;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchOrders]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
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
    setStatusFilter,
    setRiderFilter,
    setSearchQuery,
    resetFilters,
    refetchOrders,
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
