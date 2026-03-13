// services/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

// Keep the Order type here or import from types/order.ts
export type OrderStatus = "Received" | "Washing" | "Drying" | "Ready" | "Delivered" | "Cancelled" | "requested" | "picked" | "in_progress" | "washed" | "ready" | "pending_assignment";

export type Order = {
  code: string;
  date?: string; // ISO
  created_at?: string; // ISO
  items: number;
  weight_kg?: number;
  weightKg?: number;
  package: string;
  price: string;
  price_display?: string;
  status: OrderStatus;
  eta?: string;
  estimated_delivery?: string;
  deliveredAt?: string;
  delivered_at?: string;
  is_paid?: boolean;
  pickup_address?: string;
  dropoff_address?: string;
  rider?: string | null;
  order_type?: string;
};

export type Investment = {
  id: string;
  plan_type: 'starter' | 'professional' | 'enterprise';
  amount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  annual_return_percentage: number;
  expected_annual_return: number;
  expected_monthly_return: number;
  total_received_returns: number;
  lockup_period_months: number;
  investment_date: string;
  maturity_date: string;
  payout_frequency: string;
  created_at: string;
  updated_at: string;
  // Calculated fields
  progress_percentage?: number;
  days_until_maturity?: number;
  next_payout_date?: string | null;
  last_payout_date?: string | null;
};

export type InvestmentSummary = {
  total_invested: number;
  active_investments: number;
  total_investments: number;
  total_expected_returns: number;
  total_received_returns: number;
  pending_investments: number;
  completed_investments: number;
};

export type Service = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url?: string | null;
  icon?: string;
  processing_time?: number; // Processing time in hours
};

export type RiderProfile = {
  id: number;
  user?: string | null;
  display_name?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  vehicle_reg?: string | null;
  rating?: number | null;
  completed_jobs?: number | null;
  id_document?: string | null;
  license_document?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  raw?: Record<string, any>;
};

export type RiderLocation = {
  id?: number;
  rider?: number | string | null;
  rider_display?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  recorded_at?: string | null;
  raw?: Record<string, any>;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE || '',
    prepareHeaders: (headers) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('wildwash_auth_state') : null;
      if (token) {
        try {
          const authState = JSON.parse(token);
          if (authState.token) {
            headers.set('authorization', `Token ${authState.token}`);
          }
        } catch (e) {
          console.error('Failed to parse auth token', e);
        }
      }
      return headers;
    },
  }),
  tagTypes: ['Investments', 'InvestmentSummary', 'Services', 'RiderProfiles', 'RiderLocations'],
  endpoints: (builder) => ({
    getOrders: builder.query<Order[], void>({
      query: () => '/orders',
      transformResponse: (response: any) => {
        return Array.isArray(response) ? response : (response?.results || []);
      },
    }),
    getOrderByCode: builder.query<Order, string>({
      query: (code) => `/orders/${encodeURIComponent(code)}`,
    }),
    // Investment endpoints
    getMyInvestments: builder.query<Investment[], void>({
      query: () => '/loans/investments/my_investments/',
      transformResponse: (response: any) => {
        return Array.isArray(response) ? response : (response?.results || []);
      },
      providesTags: ['Investments'],
    }),
    getInvestmentSummary: builder.query<InvestmentSummary, void>({
      query: () => '/loans/investments/summary/',
      providesTags: ['InvestmentSummary'],
    }),
    createInvestment: builder.mutation<Investment, { plan_type: string; amount: number }>({
      query: (data) => ({
        url: '/loans/investments/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Investments', 'InvestmentSummary'],
    }),
    getInvestmentDetail: builder.query<Investment, string>({
      query: (id) => `/loans/investments/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Investments', id }],
    }),
    // Service endpoints
    getServices: builder.query<Service[], void>({
      query: () => '/services/',
      transformResponse: (response: any) => {
        // Handle paginated response or direct array
        return Array.isArray(response) ? response : (response?.results || []);
      },
      providesTags: ['Services'],
    }),
    getServiceDetail: builder.query<Service, number>({
      query: (id) => `/services/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Services', id }],
    }),
    // Rider endpoints
    getRiderProfiles: builder.query<RiderProfile[], void>({
      query: () => '/riders/profiles/',
      transformResponse: (response: any) => {
        return Array.isArray(response) ? response : (response?.results || []);
      },
      providesTags: ['RiderProfiles'],
    }),
    getRiderLocations: builder.query<RiderLocation[], void>({
      query: () => '/riders/',
      transformResponse: (response: any) => {
        return Array.isArray(response) ? response : (response?.results || []);
      },
      providesTags: ['RiderLocations'],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByCodeQuery,
  useGetMyInvestmentsQuery,
  useGetInvestmentSummaryQuery,
  useCreateInvestmentMutation,
  useGetInvestmentDetailQuery,
  useGetServicesQuery,
  useGetServiceDetailQuery,
  useGetRiderProfilesQuery,
  useGetRiderLocationsQuery,
} = apiSlice;
