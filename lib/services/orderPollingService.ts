/**
 * Background Order Polling Service
 * 
 * Periodically fetches orders from the backend and caches them
 * without triggering component re-renders or page reloads.
 * This runs as a separate service that components can subscribe to.
 */

interface Order {
  id: number;
  code: string;
  status: string;
  [key: string]: any;
}

interface PollingLoadState {
  loaded: boolean;
  error: string | null;
}

type PollingCallback = (orders: Order[], state: PollingLoadState) => void;

class OrderPollingService {
  private static instance: OrderPollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollDuration: number = 60000; // 1 minute default
  private subscribers: Set<PollingCallback> = new Set();
  private cachedOrders: Order[] = [];
  private isPolling: boolean = false;
  private apiBase: string = process.env.NEXT_PUBLIC_API_BASE || '';
  private lastOrderIds: Set<number> = new Set(); // Track seen order IDs
  
  // Smart polling features
  private errorCount: number = 0;
  private maxErrorCount: number = 5;
  private baseInterval: number = 60000; // 1 minute
  private currentInterval: number = this.baseInterval;
  private lastPollTime: number = 0;
  private pendingRequest: Promise<void> | null = null;
  private isPageVisible: boolean = true;
  private currentToken: string | null = null;
  private hasLoaded: boolean = false;
  private lastError: string | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): OrderPollingService {
    if (!OrderPollingService.instance) {
      OrderPollingService.instance = new OrderPollingService();
    }
    return OrderPollingService.instance;
  }

  /**
   * Start background polling with smart interval management
   */
  startPolling(token: string, intervalMs: number = 60000): void {
    if (this.isPolling && this.currentToken === token) {
      console.log('Order polling already active');
      return;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.currentToken !== token) {
      this.cachedOrders = [];
      this.hasLoaded = false;
      this.lastError = null;
      this.lastOrderIds.clear();
    }

    this.baseInterval = Math.max(15000, intervalMs);
    this.currentInterval = this.baseInterval;
    this.currentToken = token;
    this.errorCount = 0;
    this.isPolling = true;

    console.log(`Starting order polling with base interval ${this.baseInterval}ms`);

    // Set up page visibility listener
    this.setupVisibilityListener();

    // Poll immediately on start
    this.executePoll(token).catch(err => 
      console.error('Initial order poll failed:', err)
    );

    // Set up interval
    this.pollingInterval = setInterval(() => {
      if (this.isPageVisible && this.isPolling) {
        this.executePoll(token).catch(err =>
          console.error('Order polling error:', err)
        );
      }
    }, this.currentInterval);
  }

  /**
   * Stop background polling and cleanup
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.currentToken = null;
    this.errorCount = 0;
    this.currentInterval = this.baseInterval;
    
    // Remove visibility listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', () => {});
    }
    
    console.log('Order polling stopped');
  }

  /**
   * Subscribe to order updates
   * Callback is called whenever new orders are fetched
   */
  subscribe(callback: PollingCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get cached orders
   */
  getCachedOrders(): Order[] {
    return [...this.cachedOrders];
  }

  getLoadState(): PollingLoadState {
    return { loaded: this.hasLoaded, error: this.lastError };
  }

  private publishOrders(orders: Order[]): void {
    this.cachedOrders = orders;
    this.hasLoaded = true;
    this.lastError = null;
    this.subscribers.forEach(callback => {
      try {
        callback(orders, this.getLoadState());
      } catch (err) {
        console.error('Error in order polling subscriber:', err);
      }
    });
  }

  /**
   * Execute poll with deduplication and error handling
   */
  private async executePoll(token: string): Promise<void> {
    // Prevent duplicate concurrent requests
    if (this.pendingRequest) {
      return;
    }

    // Prevent polling too frequently
    const now = Date.now();
    if (now - this.lastPollTime < 5000) {
      return;
    }

    this.lastPollTime = now;
    this.pendingRequest = this.fetchOrders(token);

    try {
      await this.pendingRequest;
      // Reset interval on successful poll
      this.errorCount = 0;
      this.currentInterval = this.baseInterval;
    } catch (err) {
      // Exponential backoff on error
      this.errorCount++;
      const backoffMultiplier = Math.pow(1.5, Math.min(this.errorCount, this.maxErrorCount));
      this.currentInterval = Math.min(
        this.baseInterval * backoffMultiplier,
        this.baseInterval * 5 // Max 5x base interval
      );
      console.warn(`Poll error #${this.errorCount}, backing off to ${this.currentInterval}ms`);
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Setup page visibility listener to pause polling when tab is hidden
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      this.isPageVisible = !document.hidden;
      console.log(`Page visibility changed: ${this.isPageVisible ? 'visible' : 'hidden'}`);

      // If page becomes visible, poll immediately
      if (this.isPageVisible && this.isPolling && this.currentToken) {
        console.log('Page became visible, polling immediately');
        this.executePoll(this.currentToken).catch(err =>
          console.error('Immediate poll on visibility change failed:', err)
        );
      }
    };

    // Only add listener once
    if (!this.isPageVisible) {
      // Already listening
      return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Fetch orders from backend and notify subscribers
   * Handles pagination to fetch ALL orders for the rider
   */
  private async fetchOrders(token: string): Promise<void> {
    try {
      const fetchPage = async (page: number) => {
        const res = await fetch(`${this.apiBase}/orders/rider/?compact=1&page_size=100&page=${page}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Token ${token}`
          },
        });

        if (!res.ok) {
          throw new Error(`Orders fetch failed: ${res.status} ${res.statusText}`);
        }

        return res.json();
      };

      const toOrders = (list: any[]): Order[] => list.map((o: any) => ({
          id: o.id,
          code: o.code,
          service: {
            name: o.service_name,
            package: o.package
          },
          pickup_address: o.pickup_address,
          dropoff_address: o.dropoff_address,
          status: o.status?.toLowerCase?.() ?? o.status,
          urgency: o.urgency,
          items: o.items,
          weight_kg: o.weight_kg,
          price: o.price,
          created_at: o.created_at,
          estimated_delivery: o.estimated_delivery,
          user: {
            ...o.user,
            pickup_latitude: o.user?.pickup_latitude ?? o.pickup_latitude ?? null,
            pickup_longitude: o.user?.pickup_longitude ?? o.pickup_longitude ?? null,
          },
          pickup_location: o.pickup_location ?? (
            o.pickup_latitude != null && o.pickup_longitude != null
              ? { lat: Number(o.pickup_latitude), lng: Number(o.pickup_longitude) }
              : null
          ),
          pickup_latitude: o.pickup_latitude ?? o.user?.pickup_latitude ?? null,
          pickup_longitude: o.pickup_longitude ?? o.user?.pickup_longitude ?? null,
          dropoff_location: o.dropoff_location,
          pickup_rider: o.pickup_rider,
          delivery_rider: o.delivery_rider,
          rider: o.rider,
          actual_price: o.actual_price,
          delivered_at: o.delivered_at,
          picked_at: o.picked_at,
          ready_at: o.ready_at,
          quantity: o.quantity,
          description: o.description,
        }));

      const firstPage = await fetchPage(1);
      const firstResults: any[] = Array.isArray(firstPage)
        ? firstPage
        : Array.isArray(firstPage?.results)
          ? firstPage.results
          : [];
      let orders = toOrders(firstResults);
      this.publishOrders(orders);

      // Check for new orders (notify on status changes to 'ready' or 'requested')
      const getNewOrders = (pageOrders: Order[]) => pageOrders.filter(o => {
        const isNew = !this.lastOrderIds.has(o.id);
        const isReadyForDelivery = o.status === 'ready';
        const isRequested = o.status === 'requested';
        return isNew && (isRequested || isReadyForDelivery);
      });

      const firstPageNewOrders = getNewOrders(orders);
      if (firstPageNewOrders.length > 0) {
        this.notifyNewOrders(firstPageNewOrders);
      }
      orders.forEach(o => this.lastOrderIds.add(o.id));

      if (!Array.isArray(firstPage) && firstPage?.next) {
        const remainingPages = firstPage.count
          ? Math.ceil(firstPage.count / 100)
          : null;

        if (remainingPages) {
          const pageBatchSize = 4;
          for (let firstPageNumber = 2; firstPageNumber <= remainingPages; firstPageNumber += pageBatchSize) {
            const pageNumbers = Array.from(
              { length: Math.min(pageBatchSize, remainingPages - firstPageNumber + 1) },
              (_, index) => firstPageNumber + index
            );
            const pages = await Promise.all(pageNumbers.map(fetchPage));
            const laterOrders = pages.flatMap((page) =>
              toOrders(Array.isArray(page?.results) ? page.results : [])
            );
            const newOrders = getNewOrders(laterOrders);
            if (newOrders.length > 0) this.notifyNewOrders(newOrders);
            if (laterOrders.length > 0) {
              orders = [...orders, ...laterOrders];
              orders.forEach(o => this.lastOrderIds.add(o.id));
              this.publishOrders(orders);
            }
          }
        } else {
          let nextPage = firstPage;
          let pageNumber = 2;
          while (nextPage?.next) {
            nextPage = await fetchPage(pageNumber++);
            const laterOrders = toOrders(Array.isArray(nextPage?.results) ? nextPage.results : []);
            if (laterOrders.length === 0) break;
            const newOrders = getNewOrders(laterOrders);
            if (newOrders.length > 0) this.notifyNewOrders(newOrders);
            orders = [...orders, ...laterOrders];
            orders.forEach(o => this.lastOrderIds.add(o.id));
            this.publishOrders(orders);
          }
        }
      }

    } catch (err) {
      console.error('Background order fetch error:', err);
      this.lastError = err instanceof Error ? err.message : 'Unable to load orders.';
      this.hasLoaded = true;
      this.subscribers.forEach(callback => {
        try {
          callback(this.cachedOrders, this.getLoadState());
        } catch (subscriberError) {
          console.error('Error in order polling subscriber:', subscriberError);
        }
      });
      throw err;
    }
  }

  /**
   * Show browser notification for new orders
   * Sound notifications disabled - SMS Africa handles audio notifications instead
   */
  private notifyNewOrders(newOrders: Order[]): void {
    newOrders.forEach(order => {
      // Show browser notification only - SMS backend handles audio alerts
      if ('Notification' in window && Notification.permission === 'granted') {
        const service = order.service?.name || 'New Service';
        const statusLabel = order.status === 'ready' ? 'Ready for Delivery' : 'New Order';
        const message = `${order.code} - ${service}`;
        
        new Notification(`🎉 ${statusLabel}!`, {
          body: message,
          icon: '/icon.png',
          tag: `order-${order.id}`,
          requireInteraction: true, // Keep notification visible until user interacts
          badge: '/icon.png',
        });
      }
    });
  }

  /**
   * Trigger vibration on mobile devices
   * DISABLED - Sound notifications now handled by backend SMS service
   */
  private triggerVibration(): void {
    // Vibration disabled - relying on SMS service for audio alerts
    // Original code for reference if needed:
    // if ('vibrate' in navigator) {
    //   try {
    //     navigator.vibrate([200, 100, 200, 100, 200]);
    //   } catch (err) {
    //     console.warn('Vibration not supported:', err);
    //   }
    // }
  }

  /**
   * Play notification sound - DISABLED
   * Sound notifications handled by backend SMS service instead
   */
  private playNotificationSound(): void {
    // Sound notifications disabled - backend SMS Africa service handles audio alerts
    // Original audio synthesis code removed to prevent unwanted sounds
  }

  /**
   * Manual refresh
   */
  async refreshNow(token: string): Promise<void> {
    await this.fetchOrders(token);
  }
}

export default OrderPollingService;
