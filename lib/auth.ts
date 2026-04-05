import { User } from '@/redux/features/authSlice';

interface StoredAuthState {
  user: User;
  token: string;
}

export const AUTH_STORAGE_KEY = 'wildwash_auth_state';

export const persistAuthState = (user: User, token: string) => {
  if (typeof window !== 'undefined') {
    const state: StoredAuthState = { user, token };
    console.log('[persistAuthState] Writing to localStorage:', { key: AUTH_STORAGE_KEY, userId: user.id, tokenLength: token.length });
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    console.log('[persistAuthState] Successfully written to localStorage');
  } else {
    console.warn('[persistAuthState] Window is undefined, cannot persist');
  }
};

export const clearAuthState = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const getStoredAuthState = (): StoredAuthState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedState = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedState) {
    return null;
  }

  try {
    return JSON.parse(storedState);
  } catch {
    clearAuthState();
    return null;
  }
};

export const isValidAuthState = (state: StoredAuthState): boolean => {
  const isValid = (
    !!state &&
    typeof state === 'object' &&
    !!state.user &&
    typeof state.user === 'object' &&
    typeof state.token === 'string' &&
    state.token.length > 0
  );
  
  console.log('[isValidAuthState] Validation result:', { isValid, hasState: !!state, hasUser: !!state?.user, tokenLength: state?.token?.length });
  
  if (!isValid) {
    console.warn('[isValidAuthState] Auth state validation failed:', state);
  }
  
  return isValid;
};