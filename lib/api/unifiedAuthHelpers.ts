'use client';

import { signIn, signOut, getSession } from 'next-auth/react';
import { AppDispatch } from '@/redux/store';
import { setAuth, logout } from '@/redux/features/authSlice';

/**
 * Unified authentication helper using NextAuth for all auth methods
 * This consolidates Google OAuth and phone/password login into a single flow
 * 
 * Benefits:
 * - Single session source (NextAuth)
 * - Automatic cross-tab sync
 * - Faster (no CSRF token fetches, no manual localStorage)
 * - Better session persistence
 */

export interface UnifiedAuthResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

/**
 * Login with phone/password using NextAuth Credentials Provider
 * Much faster than handleLogin because:
 * 1. No CSRF token fetching
 * 2. No manual Redux dispatch
 * 3. NextAuth handles session persistence
 * 4. Session available immediately via useSession()
 */
export const phonePasswordLogin = async (
  phone: string,
  password: string,
  dispatch: AppDispatch,
  loginType: 'user' | 'admin' | 'rider' = 'user'
): Promise<UnifiedAuthResult> => {
  try {
    console.log(`[UnifiedAuth] Logging in ${loginType} with phone`);
    
    const providerId = `credentials-${loginType}`;
    
    // Use NextAuth's signIn - this is MUCH faster than handleLogin
    const result = await signIn(providerId, {
      phone,
      password,
      redirect: false,
    });

    if (result?.error) {
      console.error(`[UnifiedAuth] ${loginType} login error:`, result.error);
      return {
        success: false,
        error: result.error,
      };
    }

    if (!result?.ok) {
      console.error(`[UnifiedAuth] ${loginType} login failed - unknown error`);
      return {
        success: false,
        error: 'Login failed',
      };
    }

    // Get the fresh session with user data
    const session = await getSession();
    if (!session?.user) {
      console.error(`[UnifiedAuth] No session found after login`);
      return {
        success: false,
        error: 'Session not established',
      };
    }

    const user = session.user as any;
    console.log(`[UnifiedAuth] ${loginType} login successful, userId:`, user.id);

    // Update Redux with user data from NextAuth session
    const userData = {
      id: user.id,
      email: user.email,
      username: user.name,
      phone: user.phone,
      role: user.role,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      staff_type: user.staff_type,
    };

    dispatch(setAuth({
      user: userData,
      token: user.token,
    }));

    // Determine redirect based on user role
    const role = user.role;
    let redirectUrl = '/';

    if (userData.is_superuser || role === 'admin') {
      redirectUrl = '/admin';
    } else if (role === 'washer') {
      redirectUrl = '/staff/washer';
    } else if (role === 'folder') {
      redirectUrl = '/staff/folder';
    } else if (role === 'rider') {
      redirectUrl = '/rider';
    } else if (userData.is_staff || role === 'staff') {
      redirectUrl = '/staff';
    }

    return {
      success: true,
      redirectUrl,
    };
  } catch (error: any) {
    console.error('[UnifiedAuth] Unexpected error:', error);
    return {
      success: false,
      error: error?.message || 'An error occurred during login',
    };
  }
};

/**
 * Login with Google OAuth using NextAuth
 * Already fast - we just ensure Redux is updated
 */
export const googleLogin = async (
  dispatch: AppDispatch
): Promise<UnifiedAuthResult> => {
  try {
    console.log('[UnifiedAuth] Initiating Google login');

    const result = await signIn('google', { redirect: false });

    if (result?.error) {
      console.error('[UnifiedAuth] Google login error:', result.error);
      return {
        success: false,
        error: result.error,
      };
    }

    if (!result?.ok) {
      return {
        success: false,
        error: 'Google login failed',
      };
    }

    // Get session after Google signin
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Session not established',
      };
    }

    const user = session.user as any;
    console.log('[UnifiedAuth] Google login successful, userId:', user.id);

    // Update Redux from session
    const userData = {
      id: user.id,
      email: user.email,
      username: user.name,
      phone: user.phone,
      role: user.role,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      staff_type: user.staff_type,
    };

    dispatch(setAuth({
      user: userData,
      token: user.token,
    }));

    const role = user.role;
    let redirectUrl = '/';

    if (userData.is_superuser || role === 'admin') {
      redirectUrl = '/admin';
    } else if (role === 'washer') {
      redirectUrl = '/staff/washer';
    } else if (role === 'folder') {
      redirectUrl = '/staff/folder';
    } else if (role === 'rider') {
      redirectUrl = '/rider';
    } else if (userData.is_staff || role === 'staff') {
      redirectUrl = '/staff';
    }

    return {
      success: true,
      redirectUrl,
    };
  } catch (error: any) {
    console.error('[UnifiedAuth] Google login error:', error);
    return {
      success: false,
      error: error?.message || 'Google login failed',
    };
  }
};

/**
 * Unified logout - works for all auth methods
 */
export const unifiedLogout = async (dispatch: AppDispatch): Promise<void> => {
  try {
    console.log('[UnifiedAuth] Logging out');
    dispatch(logout());
    await signOut({ redirect: false });
    console.log('[UnifiedAuth] Logout successful');
  } catch (error: any) {
    console.error('[UnifiedAuth] Logout error:', error);
  }
};

/**
 * Sync NextAuth session to Redux state
 * Call this on app init and on session changes
 * This ensures Redux always reflects the current NextAuth session
 */
export const syncSessionToRedux = async (dispatch: AppDispatch): Promise<boolean> => {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      console.log('[UnifiedAuth] No session found, clearing Redux auth');
      dispatch(logout());
      return false;
    }

    const user = session.user as any;
    console.log('[UnifiedAuth] Syncing session to Redux, userId:', user.id);
    
    const userData = {
      id: user.id,
      email: user.email,
      username: user.name,
      phone: user.phone,
      role: user.role,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      staff_type: user.staff_type,
    };

    dispatch(setAuth({
      user: userData,
      token: user.token,
    }));

    return true;
  } catch (error: any) {
    console.error('[UnifiedAuth] Sync error:', error);
    return false;
  }
};
