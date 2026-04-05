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
          // On network error, we should logout to be safe
          dispatch(logout());
        }
      } else {
        console.log('[AuthInitializer] No valid stored state found');
      }

      console.log('[AuthInitializer] Finishing initial load');
      dispatch(finishInitialLoad());
    };

    // Initialize immediately
    initializeAuth();

    // Set up periodic token validation (every 5 minutes)
    const validationInterval = setInterval(initializeAuth, 5 * 60 * 1000);

    // Re-initialize on storage changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      console.log('[AuthInitializer] Storage changed:', event.key);
      if (event.key === AUTH_STORAGE_KEY) {
        initializeAuth();
      }
    };

    // Re-initialize on window focus
    const handleFocus = () => {
      console.log('[AuthInitializer] Window focused, re-validating auth');
      initializeAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(validationInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dispatch]);

  return null;
}