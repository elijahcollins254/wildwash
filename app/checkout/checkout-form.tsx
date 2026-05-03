'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Phone, CreditCard, Recycle, Gift } from 'lucide-react';
import { FiAlertTriangle } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { BNPLManager } from '@/components';
import type { RootState } from '@/redux/store';

interface CheckoutForm {
  amount: string;
  phone: string;
  order_id: string;
  paymentMethod: 'mpesa' | 'bnpl' | 'tradein' | 'gift';
  trade_description?: string;
  trade_estimated_price?: string;
}

interface UserData {
  phone?: string;
  first_name?: string;
  last_name?: string;
}

export default function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const [formData, setFormData] = useState<CheckoutForm>({
    amount: '',
    phone: '',
    order_id: '',
    paymentMethod: 'mpesa',
    trade_description: '',
    trade_estimated_price: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  // Check if profile is complete - fetch fresh data to avoid stale Redux state
  useEffect(() => {
    const checkProfileStatus = async () => {
      try {
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

        const apiBase = process.env.NEXT_PUBLIC_API_BASE;
        if (!apiBase) return;

        const response = await axios.get<any>(`${apiBase}/users/me/`, {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
          },
        });

        // Check the fresh profile_complete status from the API
        if (response.data && !response.data.profile_complete && response.data.role === 'customer') {
          setProfileIncomplete(true);
          // Show message but don't redirect immediately - let user see why
          setTimeout(() => {
            router.push('/profile');
          }, 2000);
        }
      } catch (err) {
        console.error('Error checking profile status:', err);
        // Fall back to Redux user if API fails
        if (user && !user.profile_complete && user.role === 'customer') {
          setProfileIncomplete(true);
          setTimeout(() => {
            router.push('/profile');
          }, 2000);
        }
      }
    };

    checkProfileStatus();
  }, [router]);

  // Auto-fill form from query params and user data on mount
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const amount = searchParams.get('amount');
    
    const fetchUserData = async () => {
      try {
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

        const apiBase = process.env.NEXT_PUBLIC_API_BASE;
        if (!apiBase) {
          throw new Error('API endpoint not configured');
        }

        const response = await axios.get<UserData>(`${apiBase}/users/me/`, {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
          },
        });

        const user = response.data;
        setFormData(prev => ({
          ...prev,
          order_id: orderId || prev.order_id,
          amount: amount || prev.amount,
          phone: user.phone || '',
        }));
      } catch (err) {
        console.error('Error fetching user data:', err);
        // Fallback: try to load from localStorage
        try {
          const userJson = localStorage.getItem('wildwash_auth_state');
          if (userJson) {
            const authData = JSON.parse(userJson) as { user?: UserData };
            const user = authData.user;
            if (user) {
              setFormData(prev => ({
                ...prev,
                order_id: orderId || prev.order_id,
                amount: amount || prev.amount,
                phone: user.phone || '',
              }));
            } else {
              throw new Error('No user data in auth state');
            }
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
          setFormData(prev => ({
            ...prev,
            order_id: orderId || prev.order_id,
            amount: amount || prev.amount,
          }));
        }
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Don't allow editing amount or order_id fields
    if (name === 'amount' || name === 'order_id') return;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodChange = (method: 'mpesa' | 'bnpl' | 'tradein' | 'gift') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.order_id) {
      setError('Order ID is required');
      return false;
    }

    // Check if amount is set and greater than 0
    const amount = parseFloat(formData.amount);
    if (!formData.amount || amount <= 0) {
      setError('This order does not have a price set. Please contact staff to set the actual price for this order before proceeding to checkout.');
      return false;
    }

    if (!formData.phone) {
      setError('Phone number is required');
      return false;
    }

    if (formData.paymentMethod === 'tradein') {
      if (!formData.trade_description || !formData.trade_estimated_price) {
        setError('Please provide a description and estimated price for the trade-in item.');
        return false;
      }
    }

    // Validate phone number
    if (!isValidPhoneNumber(formData.phone)) {
      setError('Invalid phone number. Use format: 254712345678 or 0712345678');
      return false;
    }

    return true;
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // Accept formats: 254712345678 or 0712345678 or +254712345678
    const cleanPhone = phone.replace('+', '');
    
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      return /^0[0-9]{9}$/.test(cleanPhone);
    }
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      return /^254[0-9]{9}$/.test(cleanPhone);
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get auth token from wildwash_auth_state
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
      
      // Get API base URL - use env variable, never fallback to localhost
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      if (!apiBase) {
        throw new Error('API endpoint not configured. Please contact support.');
      }

      // Handle BNPL payment
      if (formData.paymentMethod === 'bnpl') {
        const amount = parseFloat(formData.amount);
        
        try {
          // Check BNPL status
          const statusResponse = await axios.get<any>(
            `${apiBase}/payments/bnpl/status/`,
            {
              headers: {
                ...(token && { 'Authorization': `Token ${token}` }),
                'Content-Type': 'application/json',
              },
            }
          );

          const bnplStatus = statusResponse.data;

          // Check if enrolled and has enough credit
          if (!bnplStatus.is_enrolled) {
            setError('You need to be enrolled in BNPL first. Please check the BNPL section above.');
            setLoading(false);
            return;
          }

          if (!bnplStatus.is_active) {
            setError('Your BNPL account is inactive. Please try M-Pesa or contact support.');
            setLoading(false);
            return;
          }

          // Check if order amount exceeds available credit
          const availableCredit = bnplStatus.credit_limit - bnplStatus.current_balance;
          if (amount > availableCredit) {
            setError(
              `Order amount (KES ${amount.toLocaleString()}) exceeds your available credit (KES ${availableCredit.toLocaleString()}). Available credit limit: KES ${bnplStatus.credit_limit.toLocaleString()}`
            );
            setLoading(false);
            return;
          }

          // Process BNPL payment - update user's balance
          const bnplResponse = await axios.post(
            `${apiBase}/payments/bnpl/process/`,
            {
              order_id: formData.order_id,
              amount: amount,
            },
            {
              headers: {
                ...(token && { 'Authorization': `Token ${token}` }),
                'Content-Type': 'application/json',
              },
            }
          );

          if (bnplResponse.status === 200 || bnplResponse.status === 201) {
            setSuccess(
              `BNPL payment approved! Order of KES ${amount.toLocaleString()} added to your account. New balance: KES ${(bnplStatus.current_balance + amount).toLocaleString()}`
            );

            // Redirect after success
            setTimeout(() => {
              router.push(`/orders/${formData.order_id}/payment-status`);
            }, 2000);
          }
        } catch (bnplErr: any) {
          const errorMessage = bnplErr.response?.data?.detail || 'Failed to process BNPL payment. Please try again.';
          setError(errorMessage);
        }
        return;
      }

      // Handle other payment methods (Trade In, Gift) - show message
      if (formData.paymentMethod === 'tradein') {
        try {
          const payload = {
            description: formData.trade_description,
            estimated_price: formData.trade_estimated_price,
            contact_phone: formData.phone,
          };

          const tradeResponse = await axios.post(
            `${apiBase}/payments/tradein/`,
            payload,
            {
              headers: {
                ...(token && { 'Authorization': `Token ${token}` }),
                'Content-Type': 'application/json',
              },
            }
          );

          if (tradeResponse.status === 200 || tradeResponse.status === 201) {
            setSuccess('Trade-in submitted. Our team will contact you shortly to evaluate the item.');
            setTimeout(() => {
              router.push(`/orders/${formData.order_id}/payment-status`);
            }, 2000);
            return;
          } else {
            setError('Failed to submit trade-in. Please try again.');
            setLoading(false);
            return;
          }
        } catch (tradeErr: any) {
          const message = tradeErr.response?.data?.detail || 'Failed to submit trade-in. Please try again.';
          setError(message);
          setLoading(false);
          return;
        }
      }

      if (formData.paymentMethod === 'gift') {
        const methodMessages: Record<string, string> = {
          gift: 'Gift card option set up. Check your email for details on how to send it.',
        };
        setSuccess(methodMessages[formData.paymentMethod] || 'Payment method selected successfully!');
        setTimeout(() => {
          router.push(`/orders/${formData.order_id}/payment-status`);
        }, 2000);
        return;
      }

      // Handle M-PESA payment
      // Clean phone number (remove + if present)
      let cleanPhone = formData.phone.replace('+', '');
      
      const response = await axios.post(
        `${apiBase}/payments/mpesa/stk-push/`,
        {
          amount: formData.amount,
          phone: cleanPhone,
          order_id: formData.order_id,
        },
        {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        setSuccess(`STK push sent to ${formData.phone}. Please check your phone to complete the payment.`);
        
        // Optionally redirect after successful STK push
        setTimeout(() => {
          router.push(`/orders/${formData.order_id}/payment-status`);
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to process payment. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (profileIncomplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
            <FiAlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Complete Your Profile First</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We need your complete profile information before you can place an order. You'll be redirected shortly.
          </p>
          <button
            onClick={() => router.push('/profile/setup')}
            className="inline-flex items-center justify-center px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Profile Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Checkout</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Complete your payment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order ID */}
          <div>
            <label htmlFor="order_id" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Order ID
            </label>
            <input
              type="text"
              id="order_id"
              name="order_id"
              value={formData.order_id}
              onChange={handleChange}
              placeholder="e.g., ORD-2025-001"
              className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 cursor-not-allowed opacity-75 text-sm"
              disabled={true}
              readOnly={true}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This order ID is fixed</p>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Amount (KES)
            </label>
            <div className="mt-2 relative">
              <span className="absolute left-4 top-3 text-slate-500 dark:text-slate-400 font-medium">KES</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                placeholder="0.00"
                step="0.01"
                min="1"
                className="block w-full pl-14 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 cursor-not-allowed opacity-75 text-sm"
                disabled={true}
                readOnly={true}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This amount is fixed for your order</p>
          </div>

          {/* Phone Number - Only show for M-PESA */}
          {(formData.paymentMethod === 'mpesa' || formData.paymentMethod === 'tradein') && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., 254712345678 or 0712345678"
                className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-full bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Format: 254712345678 or 0712345678</p>
            </div>
          )}

          {/* Trade-In fields */}
          {formData.paymentMethod === 'tradein' && (
            <div>
              <label htmlFor="trade_description" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                Item to Trade In
              </label>
              <textarea
                id="trade_description"
                name="trade_description"
                value={formData.trade_description}
                onChange={(e) => setFormData(prev => ({ ...prev, trade_description: e.target.value }))}
                placeholder="Describe the item, brand, model, defects, etc."
                className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                disabled={loading}
              />

              <label htmlFor="trade_estimated_price" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mt-4">
                Estimated Price (KES)
              </label>
              <input
                type="number"
                id="trade_estimated_price"
                name="trade_estimated_price"
                value={formData.trade_estimated_price}
                onChange={(e) => setFormData(prev => ({ ...prev, trade_estimated_price: e.target.value }))}
                placeholder="Estimated price in KES"
                step="0.01"
                min="0"
                className="mt-2 block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-full bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                disabled={loading}
              />
            </div>
          )}

          {/* BNPL Component - Only show for BNPL */}
          {formData.paymentMethod === 'bnpl' && (
            <div>
              <BNPLManager />
            </div>
          )}

          {/* Payment Method Selection - Below form fields */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
              Payment Method
            </p>
            <div className="grid grid-cols-4 gap-2">
              {/* M-PESA */}
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('mpesa')}
                className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 text-center ${
                  formData.paymentMethod === 'mpesa'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700'
                }`}
              >
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">M-PESA</span>
              </button>

              {/* BNPL */}
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('bnpl')}
                className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 text-center ${
                  formData.paymentMethod === 'bnpl'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">BNPL</span>
              </button>

              {/* Trade In */}
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('tradein')}
                className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 text-center ${
                  formData.paymentMethod === 'tradein'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <Recycle className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">Trade In</span>
              </button>

              {/* Gift/Friend */}
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('gift')}
                className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 text-center ${
                  formData.paymentMethod === 'gift'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-pink-300 dark:hover:border-pink-700'
                }`}
              >
                <Gift className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">Gift</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || loadingUserData}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center mt-6"
          >
            {loading || loadingUserData ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                {loadingUserData ? 'Loading...' : 'Processing...'}
              </>
            ) : (
              <>
                {formData.paymentMethod === 'mpesa' && 'Pay with M-Pesa'}
                {formData.paymentMethod === 'bnpl' && 'Apply for BNPL'}
                {formData.paymentMethod === 'tradein' && 'Submit Trade In'}
                {formData.paymentMethod === 'gift' && 'Send as Gift'}
              </>
            )}
          </button>

          {/* Error Message - Below submit button */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message - Below submit button */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Info Message - Dynamic based on payment method */}
          {formData.paymentMethod === 'mpesa' && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-slate-700 dark:text-slate-300 text-sm">
                <strong>How it works:</strong> You will receive an M-Pesa prompt on your phone. Enter your M-Pesa PIN to complete the payment.
              </p>
            </div>
          )}

          {formData.paymentMethod === 'bnpl' && (
            <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                <strong>Buy Now, Pay Later:</strong> Split your payment into installments with zero interest. You'll receive loan terms via email.
              </p>
            </div>
          )}

          {formData.paymentMethod === 'tradein' && (
            <div className="mt-6 p-4 bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-purple-700 dark:text-purple-400 text-sm">
                <strong>Trade In:</strong> Trade your old appliances for credit. Our team will contact you to evaluate and process your trade-in.
              </p>
            </div>
          )}

          {formData.paymentMethod === 'gift' && (
            <div className="mt-6 p-4 bg-pink-100 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
              <p className="text-pink-700 dark:text-pink-400 text-sm">
                <strong>Gift Card:</strong> Send a digital gift card to a friend. They'll receive the code via email and can use it immediately.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
