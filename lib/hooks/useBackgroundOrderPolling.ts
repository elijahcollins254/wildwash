/**
 * Hook for subscribing to background order polling
 * 
 * Usage:
 * const orders = useBackgroundOrderPolling(token, true);
 * 
 * This subscribes the component to order updates from the background service
 * without causing page reloads or unnecessary re-renders.
 */

import { useEffect, useState, useRef } from 'react';
import OrderPollingService from '@/lib/services/orderPollingService';

interface Order {
  id: number;
  code: string;
  status: string;
  [key: string]: any;
}

interface OrderPollingState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

export function useBackgroundOrderPolling(
  token: string | null,
  enabled: boolean = true,
  pollIntervalMs: number = 60000
): OrderPollingState {
  const [state, setState] = useState<OrderPollingState>({
    orders: [],
    loading: true,
    error: null,
  });
  const serviceRef = useRef(OrderPollingService.getInstance());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token || !enabled) {
      // Stop polling if disabled or no token
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      serviceRef.current.stopPolling();
      setState({ orders: [], loading: false, error: null });
      return;
    }

    // Get service instance
    const service = serviceRef.current;

    // Subscribe to updates
    unsubscribeRef.current = service.subscribe((newOrders, loadState) => {
      setState({
        orders: newOrders,
        loading: !loadState.loaded,
        error: loadState.error,
      });
    });

    // Subscribe before polling so the initial response is not missed.
    service.startPolling(token, pollIntervalMs);

    const cachedOrders = service.getCachedOrders();
    const loadState = service.getLoadState();
    setState({
      orders: cachedOrders,
      loading: !loadState.loaded,
      error: loadState.error,
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [token, enabled, pollIntervalMs]);

  return state;
}

/**
 * Hook to manually refresh orders immediately
 */
export function useOrderPollingRefresh() {
  const serviceRef = useRef(OrderPollingService.getInstance());

  return async (token: string) => {
    await serviceRef.current.refreshNow(token);
  };
}
