'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'initiated' | 'success';
  message: string;
  checkout_request_id: string;
  order_id: string;
  amount: number;
  delivery_requested?: boolean;
}

export default function PaymentStatusPage() {
  const params = useParams();
  const orderId = params.code as string;
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingCount, setPollingCount] = useState(0);
  const [requestingDelivery, setRequestingDelivery] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        let token = null;
        
        // Try to get token from wildwash_auth_state first
        if (typeof window !== 'undefined') {
          const authState = localStorage.getItem('wildwash_auth_state');
          if (authState) {
            try {
              const parsed = JSON.parse(authState);
              token = parsed.token;
            } catch (e) {
              console.error('Error parsing auth state:', e);
            }
          }
        }
        
        // Fallback to direct token key if wildwash_auth_state doesn't work
        if (!token) {
          token = localStorage.getItem('token');
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/orders/${orderId}/payment-status/`,
          {
            headers: {
              ...(token && { 'Authorization': `Token ${token}` }),
            },
          }
        );

        const data = response.data as PaymentStatus;
        setPaymentStatus(data);

        // Stop polling if payment is completed or failed
        if (data.status === 'success' || data.status === 'completed' || data.status === 'failed') {
          setLoading(false);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to fetch payment status';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchPaymentStatus();

    // Poll for updates every 5 seconds (max 12 times = 60 seconds)
    const interval = setInterval(() => {
      setPollingCount(prev => {
        if (prev >= 12) {
          clearInterval(interval);
          setLoading(false);
          return prev;
        }
        return prev + 1;
      });
      fetchPaymentStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  const handleRequestDelivery = async () => {
    setRequestingDelivery(true);
    setDeliveryError('');
    setDeliverySuccess(false);

    try {
      let token = null;
      
      // Get token from localStorage
      if (typeof window !== 'undefined') {
        const authState = localStorage.getItem('wildwash_auth_state');
        if (authState) {
          try {
            const parsed = JSON.parse(authState);
            token = parsed.token;
          } catch (e) {
            console.error('Error parsing auth state:', e);
          }
        }
      }
      
      if (!token) {
        token = localStorage.getItem('token');
      }

      const response = await axios.post<{ status: string }>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/orders/${orderId}/request-delivery/`,
        {},
        {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
          },
        }
      );

      if (response.data.status === 'success') {
        setDeliverySuccess(true);
        // Reset success message after 5 seconds
        setTimeout(() => setDeliverySuccess(false), 5000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to request delivery';
      setDeliveryError(errorMsg);
      console.error('Delivery request error:', err);
    } finally {
      setRequestingDelivery(false);
    }
  };

  const handleRetryCheckout = async () => {
    setRetryLoading(true);
    try {
      // Fetch fresh order data to ensure we have the latest price
      let token = null;
      
      if (typeof window !== 'undefined') {
        const authState = localStorage.getItem('wildwash_auth_state');
        if (authState) {
          try {
            const parsed = JSON.parse(authState);
            token = parsed.token;
          } catch (e) {
            console.error('Error parsing auth state:', e);
          }
        }
      }
      
      if (!token) {
        token = localStorage.getItem('token');
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || '';
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${apiBase}/orders/orders/${orderId}/`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const latestOrder = await response.json();
      const latestPrice = (latestOrder.price || latestOrder.actual_price || '0').toString().replace(/[^0-9.]/g, '');
      
      // Redirect to checkout with the latest price from the server
      window.location.href = `/checkout?order_id=${encodeURIComponent(latestOrder.code)}&amount=${encodeURIComponent(latestPrice)}`;
    } catch (err: any) {
      console.error('Error preparing retry:', err);
      setError(`Error preparing checkout: ${err?.message || 'Unknown error'}`);
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading && !paymentStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking payment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow-lg p-8">
        {paymentStatus?.status === 'completed' || paymentStatus?.status === 'success' ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Successful</h2>
              <p className="mt-2 text-gray-600">Your payment has been processed successfully.</p>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-semibold text-gray-900">{paymentStatus.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">KES {paymentStatus.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference ID:</span>
                <span className="font-semibold text-gray-900 text-sm">{paymentStatus.checkout_request_id}</span>
              </div>
            </div>

            {deliverySuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">
                  ✓ Delivery request sent to rider!
                </p>
              </div>
            )}

            {deliveryError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  {deliveryError}
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRequestDelivery}
                disabled={requestingDelivery || deliverySuccess || paymentStatus.delivery_requested}
                className={`w-full font-semibold py-3 px-4 rounded-lg transition duration-200 text-center block ${
                  requestingDelivery || deliverySuccess || paymentStatus.delivery_requested
                    ? 'bg-green-500 text-white cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {requestingDelivery ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Requesting Delivery...
                  </span>
                ) : deliverySuccess || paymentStatus.delivery_requested ? (
                  '✓ Rider Notified'
                ) : (
                  '🚴 Request Delivery Now'
                )}
              </button>
              <Link
                href={`/orders/${orderId}`}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-center block"
              >
                View Order Details
              </Link>
              <Link
                href="/orders"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-200 text-center block"
              >
                Back to Orders
              </Link>
            </div>
          </>
        ) : paymentStatus?.status === 'failed' ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Failed</h2>
              <p className="mt-2 text-gray-600">Your payment could not be processed.</p>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-semibold text-gray-900">{paymentStatus.order_id}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRetryCheckout}
                disabled={retryLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-center"
              >
                {retryLoading ? 'Loading...' : 'Try Again'}
              </button>
              <Link
                href="/orders"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-200 text-center block"
              >
                Back to Orders
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Pending</h2>
              <p className="mt-2 text-gray-600">Waiting for your M-Pesa confirmation...</p>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                <strong>Status:</strong> {paymentStatus?.status || 'initiated'}
              </p>
              <p className="text-blue-700 text-xs mt-2">
                Check your phone for the M-Pesa prompt and enter your PIN to complete the payment.
              </p>
            </div>

            {pollingCount >= 12 && (
              <div className="mt-6">
                <button
                  onClick={handleRetryCheckout}
                  disabled={retryLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-center"
                >
                  {retryLoading ? 'Loading...' : 'Try Again'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
