/**
 * Hook for managing rider notifications with real-time polling
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  fetchRiderNotifications,
  markNotificationAsRead,
  playNotificationSound,
  RiderNotification,
} from '@/lib/notifications';

export function useRiderNotifications(
  token: string | null,
  enabled: boolean = true,
  pollInterval: number = 5000 // Poll every 5 seconds
) {
  const lastNotificationIdsRef = useRef<Set<number>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const handleNewNotifications = useCallback(
    (notifications: RiderNotification[], isInitialLoad: boolean = false) => {
      if (notifications.length > 0) {
        console.log(`[Notifications] Received ${notifications.length} notifications`);
      }
      notifications.forEach((notification) => {
        // Check if this is a new notification we haven't seen before
        if (!lastNotificationIdsRef.current.has(notification.id)) {
          lastNotificationIdsRef.current.add(notification.id);
          console.log(`[Notifications] New notification: ${notification.message}`);

          // Only play sound if NOT the initial load (avoid sounds for old notifications)
          if (!isInitialLoad) {
            playNotificationSound();

            // Show browser notification if available
            if ('Notification' in window && Notification.permission === 'granted') {
              console.log('[Notifications] Showing browser notification');
              new Notification('New Order', {
                body: notification.message,
                icon: '/icon.png',
                tag: `order-${notification.order}`,
              });
            } else {
              console.log(`[Notifications] Browser notification unavailable (permission: ${Notification.permission})`);
            }
          }

          // Mark as read after showing notification
          if (token) {
            markNotificationAsRead(notification.id, token).catch(console.error);
          }
        }
      });
    },
    [token]
  );

  const pollNotifications = useCallback(async (isInitialLoad: boolean = false) => {
    if (!token || !enabled) return;

    try {
      const notifications = await fetchRiderNotifications(token);
      handleNewNotifications(notifications, isInitialLoad);
    } catch (error) {
      console.error('[Notifications] Polling error:', error);
    }
  }, [token, enabled, handleNewNotifications]);

  useEffect(() => {
    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!token || !enabled) {
      // Clear interval if disabled or no token
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isInitializedRef.current = false;
      return;
    }

    // Initial poll - mark isInitialLoad=true so no sounds play for old notifications
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      pollNotifications(true);
    }

    // Set up polling interval - subsequent polls with isInitialLoad=false will play sounds
    pollingIntervalRef.current = setInterval(() => pollNotifications(false), pollInterval);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [token, enabled, pollInterval, pollNotifications]);
}
