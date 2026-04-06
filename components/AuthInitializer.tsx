"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch } from 'react-redux';
import { setAuth, finishInitialLoad, logout } from '@/redux/features/authSlice';

/**
 * Unified AuthInitializer using NextAuth as the single source of truth
 * 
 * This component:
 * 1. Syncs NextAuth session to Redux state on load
 * 2. Listens for session changes (login/logout) from ANY tab
 * 3. Automatically handles both Google OAuth and phone/password logins
 * 
 * Benefits over old system:
 * - Single source of truth (NextAuth session)
 * - Automatic cross-tab sync
 * - No more manual localStorage validation
 * - Faster session restoration (NextAuth does it server-side)
 * - Works for all authentication methods uniformly
 */
export default function AuthInitializer() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();

  useEffect(() => {
    console.log('[AuthInitializer] Session status:', status, 'Has session:', !!session?.user);

    if (status === 'loading') {
      // NextAuth is still checking for an existing session
      // This happens on app load
      console.log('[AuthInitializer] NextAuth is loading session data...');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      // Session is valid, sync it to Redux
      console.log('[AuthInitializer] Session authenticated, syncing to Redux, userId:', session.user.id);
      
      const userData = {
        id: session.user.id,
        email: session.user.email,
        username: session.user.name,
        phone: (session.user as any).phone,
        role: (session.user as any).role,
        is_staff: (session.user as any).is_staff,
        is_superuser: (session.user as any).is_superuser,
        staff_type: (session.user as any).staff_type,
      };

      dispatch(setAuth({
        user: userData,
        token: (session.user as any).token,
      }));
    } else if (status === 'unauthenticated') {
      // No session, make sure Redux is logged out too
      console.log('[AuthInitializer] No active session, clearing Redux auth');
      dispatch(logout());
    }

    // Mark initial load as complete
    dispatch(finishInitialLoad());
  }, [status, session, dispatch]);

  // NextAuth handles all the session management for us:
  // - It persists the JWT in HttpOnly cookies (if configured)
  // - It validates sessions server-side on app load
  // - It handles cross-tab sync via its sessionCallback
  // - It automatically refreshes tokens (if maxAge or updateAge is set)
  //
  // We just mirror that state to Redux for components that don't use useSession()

  return null;
}