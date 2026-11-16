/**
 * Hook for subscribing to live rider order updates
 * 
 * Usage:
 * const { orders } = useRiderOrderUpdates(token, true);
 * 
 * The service loads the initial order list; SSE triggers subsequent refreshes.
 */

import { useEffect, useState, useRef } from 'react';
import OrderUpdatesService from '@/lib/services/orderUpdatesService';
import { listenForOrderUpdates } from '@/lib/api/orderEvents';

interface Order {
  id: number;
  code: string;
  status: string;
  [key: string]: any;
}

interface OrderUpdatesState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

export function useRiderOrderUpdates(
  token: string | null,
  enabled: boolean = true
): OrderUpdatesState {
  const [state, setState] = useState<OrderUpdatesState>({
    orders: [],
    loading: true,
    error: null,
  });
  const serviceRef = useRef(OrderUpdatesService.getInstance());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token || !enabled) {
      // Stop live order updates if disabled or no token
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      serviceRef.current.stopUpdates();
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

    // Load the initial order list before SSE updates arrive.
    service.startUpdates(token);

    const eventController = new AbortController();
    let refreshTimer: number | undefined;
    void listenForOrderUpdates(
      eventController.signal,
      () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          void service.refreshNow(token).catch((error: unknown) => {
            console.error('[Order events] Failed to refresh rider orders:', error);
          });
        }, 300);
      },
      (error) => console.error('[Order events] SSE connection failed:', error),
    );

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
      window.clearTimeout(refreshTimer);
      eventController.abort();
    };
  }, [token, enabled]);

  return state;
}

