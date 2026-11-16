/**
 * Rider Order Updates Service
 * 
 * Fetches rider orders on demand and caches them
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

type OrderUpdateCallback = (orders: Order[], state: PollingLoadState) => void;

class OrderUpdatesService {
  private static instance: OrderUpdatesService;
  private subscribers: Set<OrderUpdateCallback> = new Set();
  private cachedOrders: Order[] = [];
  private isActive: boolean = false;
  private apiBase: string = process.env.NEXT_PUBLIC_API_BASE || '';
  private lastOrderIds: Set<number> = new Set(); // Track seen order IDs
  
  // Request coordination
  private pendingRequest: Promise<void> | null = null;
  private refreshRequested = false;
  private isPageVisible: boolean = true;
  private currentToken: string | null = null;
  private hasLoaded: boolean = false;
  private lastError: string | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): OrderUpdatesService {
    if (!OrderUpdatesService.instance) {
      OrderUpdatesService.instance = new OrderUpdatesService();
    }
    return OrderUpdatesService.instance;
  }

  /**
   * Start background order updates.
   */
  startUpdates(token: string): void {
    if (this.isActive && this.currentToken === token) {
      return;
    }

    if (this.currentToken !== token) {
      this.cachedOrders = [];
      this.hasLoaded = false;
      this.lastError = null;
      this.lastOrderIds.clear();
    }

    this.currentToken = token;
    this.isActive = true;

    this.setupVisibilityListener();

    this.executeFetch(token).catch(err =>
      console.error('Initial order fetch failed:', err)
    );
  }

  /**
   * Stop live order updates and cleanup
   */
  stopUpdates(): void {
    this.isActive = false;
    this.currentToken = null;
    
    // Remove visibility listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Subscribe to order updates
   * Callback is called whenever new orders are fetched
   */
  subscribe(callback: OrderUpdateCallback): () => void {
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
        console.error('Error in order update subscriber:', err);
      }
    });
  }

  /**
   * Fetch orders with request deduplication.
   */
  private async executeFetch(token: string): Promise<void> {
    if (this.pendingRequest) {
      this.refreshRequested = true;
      return;
    }

    this.pendingRequest = this.fetchOrders(token);

    try {
      await this.pendingRequest;
    } catch (err) {
      throw err;
    } finally {
      this.pendingRequest = null;
      if (this.refreshRequested && this.isActive && this.currentToken === token) {
        this.refreshRequested = false;
        void this.executeFetch(token).catch(err =>
          console.error('Queued order refresh failed:', err)
        );
      }
    }
  }

  /**
   * Refresh orders when a hidden tab becomes visible again.
   */
  private readonly handleVisibilityChange = () => {
    this.isPageVisible = !document.hidden;
    if (this.isPageVisible && this.isActive && this.currentToken) {
      this.executeFetch(this.currentToken).catch(err =>
        console.error('Order refresh on visibility change failed:', err)
      );
    }
  };

  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isPageVisible = !document.hidden;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Fetch orders from the backend and notify subscribers
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
      console.error('Rider order fetch error:', err);
      this.lastError = err instanceof Error ? err.message : 'Unable to load orders.';
      this.hasLoaded = true;
      this.subscribers.forEach(callback => {
        try {
          callback(this.cachedOrders, this.getLoadState());
        } catch (subscriberError) {
          console.error('Error in order update subscriber:', subscriberError);
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

export default OrderUpdatesService;
