'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { client } from '@/lib/api/client';
import { Spinner } from '@/components';
import { Calendar } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { FiX, FiCheck, FiAlertTriangle, FiArrowRight, FiRefreshCw, FiLock, FiInfo } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface BNPLResponse {
  data: BNPLStatus;
}

interface BNPLStatus {
  is_enrolled: boolean;
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
  phone_number?: string;
}

interface UserProfile {
  phone: string;
  [key: string]: any;
}

export default function BNPLManager() {
  const [status, setStatus] = useState<BNPLStatus | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentPending, setPaymentPending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  const fetchBNPLStatus = async () => {
    try {
      const data = await client.get('/payments/bnpl/status/');
      setStatus(data);
    } catch (err: any) {
      console.error('Error fetching BNPL status:', err);
      setError(err.message || 'Failed to fetch BNPL status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchBNPLStatus();
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const data = await client.get('/users/me/');
      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleOptIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First check if already enrolled
    if (status?.is_enrolled) {
      // Already enrolled, no need to show error - just silently return
      return;
    }
    
    if (!profile?.phone) {
      setError('Please add a phone number to your profile first');
      return;
    }
    try {
      setLoading(true);
      const data = await client.post('/payments/bnpl/opt_in/', { 
        phone_number: profile.phone 
      });
      setStatus(data);
      setError('');
    } catch (err: any) {
      // If error is that they're already enrolled, refresh the status
      if (err.message?.includes('already enrolled') || err.response?.status === 400) {
        // Refresh the status to get the accurate enrollment state
        try {
          const newStatus = await client.get('/payments/bnpl/status/');
          setStatus(newStatus);
          setError('');
        } catch (refreshErr: any) {
          setError('Failed to update BNPL status');
        }
      } else {
        setError(err.message || 'Failed to opt in to BNPL');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptOut = async () => {
    try {
      setLoading(true);
      await client.post('/payments/bnpl/opt_out/', {});
      // Refresh the status to get the updated enrollment state
      const newStatus = await client.get('/payments/bnpl/status/');
      setStatus(newStatus);
      setError('');
    } catch (err: any) {
      // If error is about outstanding balance, show user-friendly message
      if (err.message?.includes('outstanding balance') || err.message?.includes('balance')) {
        setError('You have an outstanding balance. Please settle all payments before opting out.');
      } else {
        setError(err.message || 'Failed to opt out of BNPL');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayBalance = async () => {
    try {
      // Validate custom amount if provided
      const amount = paymentAmount ? parseFloat(paymentAmount) : null;
      
      if (paymentAmount && (isNaN(amount!) || amount! <= 0)) {
        setError('Please enter a valid amount greater than 0');
        return;
      }
      
      if (amount && amount > (status?.current_balance || 0)) {
        setError(`Amount cannot exceed balance of KES ${status?.current_balance || 0}`);
        return;
      }
      
      setLoading(true);
      setPaymentPending(true);
      
      const payloadData: any = { 
        phone_number: profile?.phone || status?.phone_number
      };
      
      if (amount) {
        payloadData.amount = amount;
      }
      
      const data = await client.post('/payments/bnpl/pay_balance/', payloadData);
      
      setError('');
      setShowPaymentInput(false);
      setPaymentAmount('');
      
      // Show message and auto-refresh after 2 seconds (give M-Pesa callback time to process)
      showModal('Payment Initiated', `STK push sent to your phone. Please enter your M-Pesa PIN. We'll refresh your balance in a moment...`, 'info');
      
      // Polling function to check payment status using dedicated endpoint
      const pollPaymentStatus = async (attempts = 0, maxAttempts = 60) => {
        if (attempts >= maxAttempts) {
          // Max attempts reached
          setLoading(false);
          setError('Payment verification timed out. Please manually refresh or contact support.');
          return;
        }

        try {
          // Use dedicated check_pending_payment endpoint for more efficient polling
          const response = await client.get('/payments/bnpl/check_pending_payment/');
          console.log(`[Poll ${attempts}] Pending payment status:`, response);

          if (!response.has_pending_payment) {
            // Payment is no longer pending - check if successful
            if (response.payment_status === 'success') {
              const newBalance = response.current_balance;
              const paymentAmount = response.payment_amount || (status?.current_balance || 0) - newBalance;
              
              setStatus({
                is_enrolled: status?.is_enrolled ?? true,
                current_balance: newBalance,
                is_active: status?.is_active ?? true,
                credit_limit: status?.credit_limit ?? response.credit_limit,
                phone_number: status?.phone_number
              });
              setPaymentPending(false);
              setLoading(false);
              
              if (newBalance === 0) {
                showModal('Payment Successful', 'Your BNPL balance has been fully cleared!', 'success');
              } else {
                showModal('Payment Successful', `Payment of KES ${paymentAmount.toLocaleString()} confirmed! New balance: KES ${newBalance.toLocaleString()}`, 'success');
              }
              setError('');
              return;
            } else if (response.payment_status === 'failed') {
              setPaymentPending(false);
              setLoading(false);
              showModal('Payment Failed', response.message || 'Payment failed. Please try again.', 'error');
              setError(response.message || 'Payment failed');
              return;
            }
          }

          // If still pending or processing, wait and retry
          const waitTime = attempts < 5 ? 3000 : 2000; // Wait longer initially
          setTimeout(() => pollPaymentStatus(attempts + 1, maxAttempts), waitTime);
        } catch (pollErr: any) {
          console.error(`[Poll ${attempts}] Error checking payment status:`, pollErr);
          // On error, retry with longer wait
          const waitTime = attempts < 5 ? 3000 : 2000;
          setTimeout(() => pollPaymentStatus(attempts + 1, maxAttempts), waitTime);
        }
      };

      // Start polling after initial 2-second wait for M-Pesa callback
      setTimeout(() => pollPaymentStatus(), 2000);
      
    } catch (err: any) {
      setPaymentPending(false);
      setLoading(false);
      setError(err.message || 'Failed to initiate balance payment');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error || 'Unable to load BNPL status. Please try again later.'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setLoading(true);
                    setError('');
                    Promise.all([fetchProfile(), fetchBNPLStatus()]);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FiRefreshCw className="-ml-0.5 mr-2 h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 md:p-6 shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 mb-4 md:mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg flex-shrink-0">
            <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-base md:text-lg">Buy Now, Pay Later</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Split your payments into 2 installments</p>
          </div>
        </div>
        {status.is_enrolled && (
          <div className="flex items-center gap-2">
            {status.is_active ? (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-green-500"></span>
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex-shrink-0">
                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-yellow-500"></span>
                Inactive
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Only show opt-in if not enrolled, and opt-out if enrolled and balance is 0 */}
      {status.is_enrolled ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-white/50 dark:bg-black/10 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phone</p>
              <p className="text-sm font-medium truncate">{status.phone_number || profile?.phone}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Credit Limit</p>
              <p className="text-sm font-medium truncate">KES {status.credit_limit.toLocaleString()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Balance</p>
              <p className={`text-sm font-medium ${status.current_balance > 0 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                KES {status.current_balance.toLocaleString()}
              </p>
            </div>
          </div>
          {/* Opt-out button only if balance is 0 */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
              <button
                onClick={handleOptOut}
                disabled={loading || status.current_balance > 0}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 whitespace-nowrap"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                    Processing...
                  </span>
                ) : (
                  "Opt Out of BNPL"
                )}
              </button>
              <a href="/help/bnpl" className="text-sm text-slate-600 dark:text-slate-300 hover:underline text-center sm:text-left">
                Learn more about BNPL
              </a>
            </div>
            {/* If balance > 0, show warning */}
            {status.current_balance > 0 && (
              <div className="p-3 md:p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <FiAlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      Outstanding balance of KES {status.current_balance.toLocaleString()}
                      {paymentPending && ' (Payment processing...)'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    {showPaymentInput && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-600 dark:text-slate-400">KES</span>
                          <input
                            type="number"
                            min="0"
                            max={status.current_balance}
                            step="100"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max: ${status.current_balance.toLocaleString()}`}
                            className="w-full pl-12 pr-3 py-2 text-sm border border-yellow-300 dark:border-yellow-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            disabled={loading}
                          />
                        </div>
                        <button
                          onClick={() => {
                            setShowPaymentInput(false);
                            setPaymentAmount('');
                          }}
                          className="text-sm px-2 py-2 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (showPaymentInput && paymentAmount) {
                          handlePayBalance();
                        } else if (!showPaymentInput) {
                          setShowPaymentInput(true);
                        }
                      }}
                      disabled={loading}
                      className="inline-flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:hover:bg-yellow-600 rounded-md whitespace-nowrap transition-colors"
                    >
                      {loading ? (
                        <>
                          <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                          Processing...
                        </>
                      ) : showPaymentInput ? (
                        'Confirm'
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                    {paymentPending && (
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const response = await client.get('/payments/bnpl/check_pending_payment/');
                            
                            if (!response.has_pending_payment && response.payment_status === 'success') {
                              // Payment successful
                              const newBalance = response.current_balance;
                              const paymentAmount = response.payment_amount || (status?.current_balance || 0) - newBalance;
                              
                              setStatus({
                                is_enrolled: status?.is_enrolled ?? true,
                                current_balance: newBalance,
                                is_active: status?.is_active ?? true,
                                credit_limit: status?.credit_limit ?? response.credit_limit,
                                phone_number: status?.phone_number
                              });
                              setPaymentPending(false);
                              
                              if (newBalance === 0) {
                                showModal('Payment Successful', 'Your BNPL balance has been fully cleared!', 'success');
                              } else {
                                showModal('Payment Successful', `Payment of KES ${paymentAmount.toLocaleString()} confirmed! New balance: KES ${newBalance.toLocaleString()}`, 'success');
                              }
                              setError('');
                            } else if (!response.has_pending_payment && response.payment_status === 'failed') {
                              setPaymentPending(false);
                              showModal('Payment Failed', response.message || 'Payment failed', 'error');
                              setError(response.message || 'Payment failed');
                            } else if (response.has_pending_payment) {
                              setError('Payment still processing. Please wait.');
                            }
                          } catch (err: any) {
                            setError('Failed to refresh payment status');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="text-sm px-2 py-1 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded transition-colors"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                    <a
                      href="/orders"
                      className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline flex-shrink-0"
                    >
                      View Orders
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-shrink-0">
                <FiLock className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-red-800 dark:text-red-200 text-sm">
                  Split your order into 2 interest-free payments
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-red-700 dark:text-red-300">
                  <span className="inline-flex items-center">
                    <FiCheck className="h-3.5 w-3.5 mr-1 text-red-500" />
                    No interest
                  </span>
                  <span className="inline-flex items-center">
                    <FiCheck className="h-3.5 w-3.5 mr-1 text-red-500" />
                    Quick approval
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Opt-in button only if not enrolled and phone exists */}
          {profile?.phone ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 rounded-lg bg-white/50 dark:bg-black/10">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">Phone:</span>
                  <span className="font-medium truncate">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleOptIn}
                    disabled={loading || status.is_enrolled}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 h-9 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                        Enrolling...
                      </>
                    ) : status.is_enrolled ? (
                      "Already Enrolled"
                    ) : (
                      "Enroll in BNPL"
                    )}
                  </button>
                  <a href="/help/bnpl" className="text-sm text-slate-600 dark:text-slate-300 hover:underline flex-shrink-0">
                    Learn more
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 md:p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <FiInfo className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">Please add a phone number to enable BNPL</span>
                </div>
                <a
                  href="/profile"
                  className="inline-flex items-center justify-center sm:justify-start px-3 h-8 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 whitespace-nowrap flex-shrink-0"
                >
                  Update Profile
                  <FiArrowRight className="ml-2 -mr-0.5 h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 md:p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-shrink-0">
              <FiX className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}