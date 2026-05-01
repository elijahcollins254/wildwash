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

type PollingCallback = (orders: Order[]) => void;

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

    this.baseInterval = Math.max(30000, intervalMs); // Minimum 30 seconds
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
   */
  private async fetchOrders(token: string): Promise<void> {
    try {
      const res = await fetch(`${this.apiBase}/orders/rider/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Token ${token}`
        },
      });

      if (!res.ok) {
        throw new Error(`Orders fetch failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json().catch(() => null);
      const list: any[] = Array.isArray(data) 
        ? data 
        : Array.isArray(data?.results) 
        ? data.results 
        : [];

      // Process orders
      const orders: Order[] = list.map((o: any) => ({
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
        user: o.user,
        pickup_location: o.pickup_location,
        dropoff_location: o.dropoff_location,
      }));

      // Check for new orders (notify on status changes to 'ready' or 'requested')
      const newOrders = orders.filter(o => {
        const isNew = !this.lastOrderIds.has(o.id);
        const isReadyForDelivery = o.status === 'ready';
        const isRequested = o.status === 'requested';
        return isNew && (isRequested || isReadyForDelivery);
      });

      // Notify about new orders
      if (newOrders.length > 0) {
        this.notifyNewOrders(newOrders);
      }

      // Update lastOrderIds with all current order IDs
      orders.forEach(o => this.lastOrderIds.add(o.id));

      // Update cache
      this.cachedOrders = orders;

      // Notify all subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(orders);
        } catch (err) {
          console.error('Error in order polling subscriber:', err);
        }
      });

    } catch (err) {
      console.error('Background order fetch error:', err);
    }
  }

  /**
   * Show browser notification and play sound for new orders
   */
  private notifyNewOrders(newOrders: Order[]): void {
    newOrders.forEach(order => {
      // Play notification sound
      this.playNotificationSound();

      // Trigger vibration on mobile
      this.triggerVibration();

      // Show browser notification
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
   */
  private triggerVibration(): void {
    if ('vibrate' in navigator) {
      try {
        // Vibration pattern: [vibrate, pause, vibrate, pause, vibrate]
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (err) {
        console.warn('Vibration not supported:', err);
      }
    }
  }

  /**
   * Play notification sound - LOUD version for noisy environments
   */
  private playNotificationSound(): void {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a master gain node with higher volume
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.setValueAtTime(0.8, audioContext.currentTime); // 80% volume (loud but safe)

      // Create compressor for even louder perceived volume
      const compressor = audioContext.createDynamicsCompressor();
      compressor.connect(masterGain);
      compressor.threshold.setValueAtTime(-30, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);

      const now = audioContext.currentTime;
      const beepDuration = 0.15;
      const pauseDuration = 0.1;

      // Helper function to create a beep
      const createBeep = (frequency: number, startTime: number) => {
        const osc = audioContext.createOscillator();
        const gainEnv = audioContext.createGain();

        osc.connect(gainEnv);
        gainEnv.connect(compressor);

        osc.frequency.value = frequency;
        osc.type = 'sine';

        // LOUD attack and hold
        gainEnv.gain.setValueAtTime(0.7, startTime);
        gainEnv.gain.linearRampToValueAtTime(0.7, startTime + beepDuration - 0.05);
        gainEnv.gain.linearRampToValueAtTime(0, startTime + beepDuration);

        osc.start(startTime);
        osc.stop(startTime + beepDuration);
      };

      // Create 5 loud beeps in ascending frequency for attention-grabbing sound
      createBeep(600, now);
      createBeep(800, now + beepDuration + pauseDuration);
      createBeep(1000, now + (beepDuration + pauseDuration) * 2);
      createBeep(1200, now + (beepDuration + pauseDuration) * 3);
      createBeep(1400, now + (beepDuration + pauseDuration) * 4);
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  }

  /**
   * Manual refresh
   */
  async refreshNow(token: string): Promise<void> {
    await this.fetchOrders(token);
  }
}

export default OrderPollingService;
