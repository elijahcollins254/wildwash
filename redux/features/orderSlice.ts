// store/slices/orderSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';

//
// Types (mirror what your frontend expects)
//
type StaffInputDetail = {
  staff_member: string;
  staff_role: 'Washer' | 'Folder' | 'Fumigator';
  items?: number;
  weight_kg?: number;
  description?: string;
  actual_price?: number | null;
  status_recorded?: string;
  recorded_at?: string;
};

type BackendOrder = {
  id: number;
  code: string;
  created_at: string;
  items: number;
  weight_kg?: number | string | null;
  service?: { name?: string } | string | null; // sometimes serializer returns nested service
  package?: string; // fallback: service name or provided string
  price?: string | number | null;
  price_display?: string | null;
  total_price?: number | null; // total estimated price from backend
  order_items?: Array<{ service: number; service_name: string; service_price: number; quantity: number }>;
  status: 'requested' | 'picked' | 'in_progress' | 'ready' | 'delivered' | 'cancelled' | string;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  is_paid?: boolean;
  payment_method?: string | null; // 'mpesa', 'bnpl', 'tradein', 'gift', etc.
  staff_input_details?: StaffInputDetail[];
};

export type Order = {
  code: string;
  date?: string; // ISO
  created_at?: string; // ISO
  items: number;
  weightKg?: number | null;
  weight_kg?: number | null;
  package: string;
  price: string; // formatted for display
  price_display?: string | null;
  total_price?: number | null; // total estimated price from backend
  actual_price?: string | null; // price entered by staff
  staff_input_details?: StaffInputDetail[];
  status: "Received" | "Washing" | "Drying" | "Ready" | "Delivered" | "Cancelled";
  eta?: string | null;
  estimated_delivery?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;
  is_paid?: boolean;
  payment_method?: string | null; // 'mpesa', 'bnpl', 'tradein', 'gift', etc.
};

type OrdersState = {
  orders: Order[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  statusFilter: "All" | Order['status'];
  query: string;
  creating: boolean;
  createLoading: boolean;
  // small refresh token to force re-fetch from component if needed
  refreshCounter: number;
};

const statusMap: Record<string, Order['status']> = {
  requested: "Received",
  picked: "Washing",
  in_progress: "Drying",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const frontendToBackendStatus: Record<string, string> = {
  Received: 'requested',
  Washing: 'picked',
  Drying: 'in_progress',
  Ready: 'ready',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

function backendToFrontend(o: BackendOrder): Order {
  // Use the price field from backend first (includes delivery multiplier)
  // Then fall back to price_display or calculate from order_items
  let price = '';
  
  if (o.price) {
    // Use the price field directly - it already has the delivery multiplier applied
    const priceNum = Number(o.price);
    price = `KSh ${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (o.price_display) {
    price = o.price_display;
  } else if (o.order_items && o.order_items.length > 0) {
    // Only calculate from order items if price field is not available
    const total = o.order_items.reduce((acc, item) => {
      return acc + (item.service_price * item.quantity);
    }, 0);
    price = `KSh ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const weightKg = o.weight_kg ? Number(o.weight_kg) : undefined;
  const eta = o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleString() : undefined;
  const deliveredAt = o.delivered_at ? new Date(o.delivered_at).toLocaleString() : undefined;

  // determine package/service name robustly
  let pkg = '';
  if (typeof o.package === 'string' && o.package) pkg = o.package;
  else if (o.service && typeof o.service === 'object' && (o.service as any).name) pkg = (o.service as any).name;
  else pkg = `Package ${o.id}`;

  return {
    code: o.code || `WW-${o.id}`,
    date: o.created_at,
    created_at: o.created_at,
    items: o.items ?? 0,
    weightKg,
    weight_kg: o.weight_kg ? Number(o.weight_kg) : undefined,
    package: pkg,
    price,
    price_display: o.price_display,
    total_price: o.total_price ?? null,
    staff_input_details: o.staff_input_details,
    status: statusMap[o.status] ?? "Received",
    eta,
    estimated_delivery: o.estimated_delivery,
    deliveredAt,
    delivered_at: o.delivered_at,
    is_paid: o.is_paid ?? false,
    payment_method: o.payment_method ?? null,
  };
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [k, ...v] = c.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

//
// Async thunks
//
export const fetchOrders = createAsyncThunk<
  { orders: Order[]; totalCount: number },
  void,
  { state: any; rejectValue: string }
>('orders/fetchOrders', async (_, { getState, rejectWithValue }) => {
  const state = getState().orders as OrdersState;
  const params = new URLSearchParams();
  params.set('page', String(state.page));
  params.set('page_size', String(state.pageSize));
  if (state.statusFilter !== 'All') {
    // map frontend label to backend code
    const backend = frontendToBackendStatus[state.statusFilter] ?? state.statusFilter;
    params.set('status', backend);
  }
  if (state.query) params.set('search', state.query);

  // Use public env var when available (deployed host). Fall back to relative
  // path so production builds that proxy API requests work and local dev
  // without env var doesn't accidentally call localhost on hosted sites.
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const baseUrl = API_BASE
    ? `${API_BASE.replace(/\/+$/g, "")}/orders/`
    : "/orders/";
  const url = `${baseUrl}?${params.toString()}`;

  try {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      const authState = localStorage.getItem('wildwash_auth_state');
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.token ?? null;
        } catch (e) {
          console.error('Error parsing auth state:', e);
        }
      }
    }
    
    const headers: Record<string, string> = { Accept: 'application/json' };
    let res: Response;
    if (token) {
      headers['Authorization'] = `Token ${token}`;
      res = await fetch(url, { headers });
    } else {
      // session cookie flow
      const csrftoken = getCookie('csrftoken');
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;
      res = await fetch(url, { headers, credentials: 'include' });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText || 'Fetch failed');
      return rejectWithValue(`Failed to load orders: ${res.status} - ${text}`);
    }

    const data = await res.json();

    let list: BackendOrder[] = [];
    let count = 0;
    if (Array.isArray(data)) {
      list = data as BackendOrder[];
      count = list.length;
    } else {
      list = (data.results ?? []) as BackendOrder[];
      count = typeof data.count === 'number' ? data.count : list.length;
    }

    const mapped = list.map(backendToFrontend);
    return { orders: mapped, totalCount: count };
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to fetch orders');
  }
});

type CreateOrderPayload = {
  service: number | null;
  pickup_address: string;
  dropoff_address: string;
  urgency?: number;
  items?: number;
  package?: number;
  weight_kg?: number | null;
  price?: string | null;
  estimated_delivery?: string | null;
};

export const createOrder = createAsyncThunk<
  Order,
  CreateOrderPayload,
  { rejectValue: string }
>('orders/createOrder', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    let res: Response;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch('/api/orders/', { method: 'POST', headers, body: JSON.stringify(payload) });
    } else {
      const csrftoken = getCookie('csrftoken');
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;
      res = await fetch('/api/orders/', { method: 'POST', headers, body: JSON.stringify(payload), credentials: 'include' });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText || '');
      return rejectWithValue(`Create failed ${res.status}: ${text}`);
    }

    const created = (await res.json()) as BackendOrder;
    const mapped = backendToFrontend(created);

    // After creating, it's common to refresh page 1 so the newest appears
    dispatch(setPage(1));
    dispatch(incrementRefresh()); // signal components if they want to listen
    // Optionally trigger fetchOrders immediately
    dispatch(fetchOrders());

    return mapped;
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to create order');
  }
});

//
// Slice
//
const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 6,
  totalPages: 1,
  totalCount: 0,
  statusFilter: 'All',
  query: '',
  creating: false,
  createLoading: false,
  refreshCounter: 0,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<OrdersState['statusFilter']>) {
      state.statusFilter = action.payload;
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    incrementRefresh(state) {
      state.refreshCounter += 1;
    },
  },
  extraReducers: (builder) => {
    // fetchOrders
    builder.addCase(fetchOrders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchOrders.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = action.payload.orders;
      state.totalCount = action.payload.totalCount;
      state.totalPages = Math.max(1, Math.ceil(action.payload.totalCount / state.pageSize));
      state.error = null;
    });
    builder.addCase(fetchOrders.rejected, (state, action) => {
      state.loading = false;
      state.orders = [];
      state.error = action.payload ?? action.error.message ?? 'Failed to load orders';
    });

    // createOrder
    builder.addCase(createOrder.pending, (state) => {
      state.createLoading = true;
      state.error = null;
    });
    builder.addCase(createOrder.fulfilled, (state, action) => {
      state.createLoading = false;
      // Optionally add the new order at start of list
      state.orders = [action.payload, ...state.orders];
      state.error = null;
    });
    builder.addCase(createOrder.rejected, (state, action) => {
      state.createLoading = false;
      state.error = action.payload ?? action.error.message ?? 'Failed to create order';
    });
  },
});

export const { setPage, setPageSize, setStatusFilter, setQuery, clearError, incrementRefresh } =
  ordersSlice.actions;

export default ordersSlice.reducer;

//
// Selectors (use with useSelector)
//
// Select full orders state
export const selectOrdersState = (state: any): OrdersState => state.orders;

// Basic selectors
export const selectOrders = createSelector(
  [selectOrdersState],
  (ordersState) => ordersState.orders
);
export const selectOrdersLoading = createSelector(
  [selectOrdersState],
  (ordersState) => ordersState.loading
);
export const selectOrdersError = createSelector(
  [selectOrdersState],
  (ordersState) => ordersState.error
);

// ✅ Memoized meta selector (fixing the warning!)
export const selectOrdersMeta = createSelector(
  [selectOrdersState],
  (ordersState) => ({
    page: ordersState.page,
    pageSize: ordersState.pageSize,
    totalPages: ordersState.totalPages,
    totalCount: ordersState.totalCount,
    statusFilter: ordersState.statusFilter,
    query: ordersState.query,
  })
);
