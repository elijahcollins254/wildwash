import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export type Order = {
  id?: number;
  code?: string;
  created_at?: string;
  price?: string | number;
  status?: string;
  rider?: string | null;
  raw?: Record<string, any>;
};

export type RiderLocation = {
  id?: number;
  rider?: string | number | null;
  rider_display?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accuracy?: number | null;
  speed?: number | null;
  recorded_at?: string | null;
  raw?: Record<string, any>;
};

export type User = {
  id?: number;
  username?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  location?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  created_at?: string;
  is_active?: boolean;
  raw?: Record<string, any>;
};

export type LoanApplication = {
  id?: string;
  loan_type?: string;
  loan_amount?: string | number;
  duration_days?: number;
  purpose?: string;
  status?: string;
  total_repayment?: string | number;
  created_at?: string;
  approved_at?: string;
  order_code?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  guarantors?: Array<{
    id?: string;
    name?: string;
    phone_number?: string;
    email?: string;
  }>;
  raw?: Record<string, any>;
};

export type TradeIn = {
  id?: number;
  user_id?: number;
  user_name?: string;
  user_phone?: string;
  description?: string;
  estimated_price?: string | number;
  contact_phone?: string;
  status?: string;
  created_at?: string;
  raw?: Record<string, any>;
};

export type BNPLUser = {
  id?: number;
  user_id?: number;
  user_name?: string;
  user_phone?: string;
  is_enrolled?: boolean;
  is_active?: boolean;
  credit_limit?: string | number;
  current_balance?: string | number;
  created_at?: string;
  updated_at?: string;
  raw?: Record<string, any>;
};

export type Transaction = {
  id?: number;
  user_id?: number;
  user_name?: string;
  user_phone?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  status?: string;
  provider_reference?: string;
  order_id?: number;
  created_at?: string;
  initiated_at?: string;
  completed_at?: string;
  notes?: string;
  raw?: Record<string, any>;
};

interface AdminState {
  orders: Order[];
  locations: RiderLocation[];
  users: User[];
  loans: LoanApplication[];
  tradeIns: TradeIn[];
  bnplUsers: BNPLUser[];
  transactions: Transaction[];

  // Loading states - true only on initial load
  ordersLoading: boolean;
  locationsLoading: boolean;
  usersLoading: boolean;
  loansLoading: boolean;
  tradeInsLoading: boolean;
  bnplLoading: boolean;
  transactionsLoading: boolean;

  // Refreshing states - true during refresh (keeps data visible)
  ordersRefreshing: boolean;
  locationsRefreshing: boolean;
  usersRefreshing: boolean;
  loansRefreshing: boolean;
  tradeInsRefreshing: boolean;
  bnplRefreshing: boolean;
  transactionsRefreshing: boolean;

  // Error states
  ordersError: string | null;
  locationsError: string | null;
  usersError: string | null;
  loansError: string | null;
  tradeInsError: string | null;
  bnplError: string | null;
  transactionsError: string | null;

  // Tracking which endpoints have been loaded at least once
  ordersLoaded: boolean;
  locationsLoaded: boolean;
  usersLoaded: boolean;
  loansLoaded: boolean;
  tradeInsLoaded: boolean;
  bnplLoaded: boolean;
  transactionsLoaded: boolean;
}

const initialState: AdminState = {
  orders: [],
  locations: [],
  users: [],
  loans: [],
  tradeIns: [],
  bnplUsers: [],
  transactions: [],
  ordersLoading: false,
  locationsLoading: false,
  usersLoading: false,
  loansLoading: false,
  tradeInsLoading: false,
  bnplLoading: false,
  transactionsLoading: false,
  ordersRefreshing: false,
  locationsRefreshing: false,
  usersRefreshing: false,
  loansRefreshing: false,
  tradeInsRefreshing: false,
  bnplRefreshing: false,
  transactionsRefreshing: false,
  ordersError: null,
  locationsError: null,
  usersError: null,
  loansError: null,
  tradeInsError: null,
  bnplError: null,
  transactionsError: null,
  ordersLoaded: false,
  locationsLoaded: false,
  usersLoaded: false,
  loansLoaded: false,
  tradeInsLoaded: false,
  bnplLoaded: false,
  transactionsLoaded: false,
};

// Helper to get client - will be injected from component
let apiClient: any = null;
export const setAdminApiClient = (client: any) => {
  apiClient = client;
};

// Async Thunks
export const fetchOrders = createAsyncThunk(
  'admin/fetchOrders',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/orders/?page_size=100');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      // Transform data to include full response in 'raw' property for admin page compatibility
      return list.map((order: any) => ({
        ...order,
        raw: order // Store full response as 'raw' for admin page access
      }));
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load orders');
    }
  }
);

export const fetchLocations = createAsyncThunk(
  'admin/fetchLocations',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/riders/');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load rider locations');
    }
  }
);

export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/users/users/?page_size=100');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load users');
    }
  }
);

export const fetchLoans = createAsyncThunk(
  'admin/fetchLoans',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/loans/loans/?page_size=100');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load loan applications');
    }
  }
);

export const fetchTradeIns = createAsyncThunk(
  'admin/fetchTradeIns',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/payments/tradein/?page_size=100');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load trade-ins');
    }
  }
);

export const fetchBNPL = createAsyncThunk(
  'admin/fetchBNPL',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/payments/bnpl/users/?page_size=100');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load BNPL users');
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'admin/fetchTransactions',
  async (_, { rejectWithValue }) => {
    if (!apiClient) return rejectWithValue('API client not initialized');
    try {
      const data = await apiClient.get('/payments/?page_size=100&ordering=-created_at');
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load transactions');
    }
  }
);

// Slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminData: () => initialState,
  },
  extraReducers: (builder) => {
    // Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        if (!state.ordersLoaded) {
          state.ordersLoading = true;
        }
        state.ordersRefreshing = true;
        state.ordersError = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.orders = action.payload;
        state.ordersLoading = false;
        state.ordersRefreshing = false;
        state.ordersLoaded = true;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.ordersLoading = false;
        state.ordersRefreshing = false;
        state.ordersError = action.payload as string;
      });

    // Locations
    builder
      .addCase(fetchLocations.pending, (state) => {
        if (!state.locationsLoaded) {
          state.locationsLoading = true;
        }
        state.locationsRefreshing = true;
        state.locationsError = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.locations = action.payload;
        state.locationsLoading = false;
        state.locationsRefreshing = false;
        state.locationsLoaded = true;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.locationsLoading = false;
        state.locationsRefreshing = false;
        state.locationsError = action.payload as string;
      });

    // Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        if (!state.usersLoaded) {
          state.usersLoading = true;
        }
        state.usersRefreshing = true;
        state.usersError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.usersLoading = false;
        state.usersRefreshing = false;
        state.usersLoaded = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersRefreshing = false;
        state.usersError = action.payload as string;
      });

    // Loans
    builder
      .addCase(fetchLoans.pending, (state) => {
        if (!state.loansLoaded) {
          state.loansLoading = true;
        }
        state.loansRefreshing = true;
        state.loansError = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.loans = action.payload;
        state.loansLoading = false;
        state.loansRefreshing = false;
        state.loansLoaded = true;
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        state.loansLoading = false;
        state.loansRefreshing = false;
        state.loansError = action.payload as string;
      });

    // TradeIns
    builder
      .addCase(fetchTradeIns.pending, (state) => {
        if (!state.tradeInsLoaded) {
          state.tradeInsLoading = true;
        }
        state.tradeInsRefreshing = true;
        state.tradeInsError = null;
      })
      .addCase(fetchTradeIns.fulfilled, (state, action) => {
        state.tradeIns = action.payload;
        state.tradeInsLoading = false;
        state.tradeInsRefreshing = false;
        state.tradeInsLoaded = true;
      })
      .addCase(fetchTradeIns.rejected, (state, action) => {
        state.tradeInsLoading = false;
        state.tradeInsRefreshing = false;
        state.tradeInsError = action.payload as string;
      });

    // BNPL
    builder
      .addCase(fetchBNPL.pending, (state) => {
        if (!state.bnplLoaded) {
          state.bnplLoading = true;
        }
        state.bnplRefreshing = true;
        state.bnplError = null;
      })
      .addCase(fetchBNPL.fulfilled, (state, action) => {
        state.bnplUsers = action.payload;
        state.bnplLoading = false;
        state.bnplRefreshing = false;
        state.bnplLoaded = true;
      })
      .addCase(fetchBNPL.rejected, (state, action) => {
        state.bnplLoading = false;
        state.bnplRefreshing = false;
        state.bnplError = action.payload as string;
      });

    // Transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        if (!state.transactionsLoaded) {
          state.transactionsLoading = true;
        }
        state.transactionsRefreshing = true;
        state.transactionsError = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
        state.transactionsLoading = false;
        state.transactionsRefreshing = false;
        state.transactionsLoaded = true;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsRefreshing = false;
        state.transactionsError = action.payload as string;
      });
  },
});

export const { clearAdminData } = adminSlice.actions;
export default adminSlice.reducer;
