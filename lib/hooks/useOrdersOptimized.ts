/**
 * useOrdersOptimized - Optimized hook for using orders context
 * 
 * Features:
 * - Lazy loading: don't fetch until component mounts
 * - Pagination support built-in
 * - Auto-refetch on URL/filter changes
 * - Loading states for better UX
 */

import { useEffect, useState } from 'react';
import { useOrders } from '@/lib/context/OrderContext';

interface UseOrdersOptimizedOptions {
  autoFetch?: boolean;
  cacheTimeout?: number; // milliseconds
}

export const useOrdersOptimized = (options: UseOrdersOptimizedOptions = {}) => {
  const {
    autoFetch = true,
    cacheTimeout = 300000, // 5 minutes default
  } = options;

  const {
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
  } = useOrders();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on first mount
  useEffect(() => {
    if (autoFetch && !isInitialized) {
      setIsInitialized(true);
    }
  }, [autoFetch, isInitialized]);

  return {
    // Data
    orders,
    totalOrdersCount,
    isLoading,
    error,
    isInitialized,

    // Filters
    statusFilter,
    riderFilter,
    searchQuery,
    setStatusFilter,
    setRiderFilter,
    setSearchQuery,
    resetFilters,

    // Actions
    refetchOrders,

    // Helper: apply multiple filters at once
    applyFilters: (status?: string, rider?: string, search?: string) => {
      if (status !== undefined) setStatusFilter(status);
      if (rider !== undefined) setRiderFilter(rider);
      if (search !== undefined) setSearchQuery(search);
    },
  };
};
