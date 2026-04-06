"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAuth, finishInitialLoad, logout } from '@/redux/features/authSlice';
import { getStoredAuthState, isValidAuthState, AUTH_STORAGE_KEY } from '@/lib/auth';
import { validateToken } from '@/lib/api/auth';

export default function AuthInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthInitializer] Initializing auth...');
      const storedState = getStoredAuthState();
      console.log('[AuthInitializer] Stored state:', storedState ? { user: storedState.user.id, hasToken: !!storedState.token } : null);

      if (storedState && isValidAuthState(storedState)) {
        console.log('[AuthInitializer] Valid stored state found, validating token...');
        try {
          // Attempt to validate the token
          console.log('[AuthInitializer] Calling validateToken()');
          const isValid = await validateToken();
          console.log('[AuthInitializer] Token validation result:', isValid);
          
          if (isValid) {
            console.log('[AuthInitializer] Token is valid, setting auth');
            // Set the authentication state in Redux
            dispatch(setAuth({ 
              user: storedState.user, 
              token: storedState.token 
            }));
          } else {
            console.warn('[AuthInitializer] Token validation failed, logging out');
            // If token is invalid, clear everything
            dispatch(logout());
          }
        } catch (error) {
          console.error('[AuthInitializer] Error validating token:', error);
          // On network error, restore auth state instead of logging out
          // This prevents temporary network issues from logging out users
          console.log('[AuthInitializer] Restoring auth state after validation error');
          dispatch(setAuth({
            user: storedState.user,
            token: storedState.token
          }));
        }
      } else {
        console.log('[AuthInitializer] No valid stored state found');
      }

      console.log('[AuthInitializer] Finishing initial load');
      dispatch(finishInitialLoad());
    };

    // Initialize immediately on first load
    initializeAuth();

    // Set up periodic token validation (every 30 minutes instead of 5)
    const validationInterval = setInterval(initializeAuth, 30 * 60 * 1000);

    // Re-initialize on storage changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      console.log('[AuthInitializer] Storage changed:', event.key);
      if (event.key === AUTH_STORAGE_KEY) {
        initializeAuth();
      }
    };

    // Re-initialize on window focus (but with debounce to reduce calls)
    let focusTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      console.log('[AuthInitializer] Window focused');
      clearTimeout(focusTimeout);
      // Debounce focus events to avoid rapid re-initialization
      focusTimeout = setTimeout(initializeAuth, 1000);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(validationInterval);
      clearTimeout(focusTimeout);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dispatch]);

  return null;
}