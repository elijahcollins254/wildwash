import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistAuthState, clearAuthState } from '@/lib/auth';

export interface User {
	role?: string;
	username?: string;
	[key: string]: any;
}

interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: User | null;
}

interface SetAuthPayload {
	user: User;
	token: string;
}

const initialState = {
	isAuthenticated: false,
	isLoading: true,
	user: null,
} as AuthState;

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		setAuth: (state, action: PayloadAction<SetAuthPayload>) => {
			console.log('[authSlice.setAuth] Setting auth state:', { userId: action.payload.user.id, hasToken: !!action.payload.token });
			state.isAuthenticated = true;
			state.user = action.payload.user;
			console.log('[authSlice.setAuth] Persisting auth state to localStorage');
			persistAuthState(action.payload.user, action.payload.token);
			console.log('[authSlice.setAuth] Auth state persisted');
		},
		logout: state => {
			console.log('[authSlice.logout] Logging out user');
			state.isAuthenticated = false;
			state.user = null;
			clearAuthState();
		},
		finishInitialLoad: state => {
			console.log('[authSlice.finishInitialLoad] Initial load finished');
			state.isLoading = false;
		},
	},
});

export const { setAuth, logout, finishInitialLoad } = authSlice.actions;
export default authSlice.reducer;
