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
      }
    });
    console.log('[validateToken] Token validation successful:', { userId: response.data.id, email: response.data.email });
    return true;
  } catch (error: any) {
    console.error('[validateToken] Token validation failed:', {
      status: error.response?.status,
      message: error.message,
      endpoint: `${API_URL}/users/me/`
    });
    clearAuthState();
    return false;
  }
};