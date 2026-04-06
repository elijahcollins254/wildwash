import axios from 'axios';
import { getStoredAuthState, clearAuthState } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || '';

export const validateToken = async (): Promise<boolean> => {
  const authState = getStoredAuthState();
  console.log('[validateToken] Checking stored auth state:', authState ? { userId: authState.user.id, token: authState.token.substring(0, 10) + '...' } : null);
  
  if (!authState?.token) {
    console.warn('[validateToken] No token found');
    return false;
  }

  try {
    console.log('[validateToken] Calling /users/me/ endpoint');
    const response = await axios.get(`${API_URL}/users/me/`, {
      headers: {
        Authorization: `Token ${authState.token}`
      },
      timeout: 5000  // 5 second timeout
    });
    console.log('[validateToken] Token validation successful:', { userId: (response.data as any).id, email: (response.data as any).email });
    return true;
  } catch (error: any) {
    // Only clear auth if it's a 401 (Unauthorized) error - meaning token is actually invalid
    // Don't clear on network errors or server errors - user should remain logged in
    const status = error.response?.status;
    const isUnauthorized = status === 401;
    
    console.error('[validateToken] Token validation failed:', {
      status,
      message: error.message,
      endpoint: `${API_URL}/users/me/`,
      isUnauthorized
    });
    
    if (isUnauthorized) {
      console.warn('[validateToken] Token is invalid (401), clearing auth');
      clearAuthState();
    } else {
      console.warn('[validateToken] Network/server error - keeping user logged in');
    }
    
    return !isUnauthorized;  // Return false only for 401, true for other errors
  }
};