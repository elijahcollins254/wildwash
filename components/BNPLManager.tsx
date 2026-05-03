'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { client } from '@/lib/api/client';
import { Spinner } from '@/components';
import { Calendar } from 'lucide-react';
import Modal from '@/components/ui/Modal';

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
      setLoading(true);
      setPaymentPending(true);
      const data = await client.post('/payments/bnpl/pay_balance/', { 
        phone_number: profile?.phone || status?.phone_number
      });
      
      setError('');
      
      // Show message and auto-refresh after 5 seconds (give M-Pesa callback time to process)
      showModal('Payment Initiated', `STK push sent to your phone. Please enter your M-Pesa PIN. We'll refresh your balance in a moment...`, 'info');
      
      // Polling function to check payment status
      const pollPaymentStatus = async (attempts = 0, maxAttempts = 30) => {
        if (attempts >= maxAttempts) {
          // Max attempts reached
          setLoading(false);
          setError('Payment verification timed out. Please manually refresh or contact support.');
          return;
        }

        try {
          const newStatus = await client.get('/payments/bnpl/status/');
          console.log(`[Poll ${attempts}] BNPL status:`, newStatus);

          // Check if balance has been reduced (payment was successful)
          if (newStatus && newStatus.current_balance !== undefined) {
            const currentBalance = typeof newStatus.current_balance === 'string' 
              ? parseFloat(newStatus.current_balance) 
              : newStatus.current_balance;
            
            const previousBalance = typeof status?.current_balance === 'string'
              ? parseFloat(status.current_balance)
              : status?.current_balance || 0;

            // If balance decreased or is now 0, payment succeeded
            if (currentBalance < previousBalance || currentBalance === 0) {
              setStatus(newStatus);
              setPaymentPending(false);
              setLoading(false);
              
              if (currentBalance === 0) {
                showModal('Payment Successful', 'Your BNPL balance has been cleared!', 'success');
                setError('');
              } else {
                showModal('Payment Successful', `Payment confirmed! New balance: KES ${currentBalance.toLocaleString()}`, 'success');
                setError('');
              }
              return;
            }
          }

          // If not yet confirmed, wait and retry
          // Wait longer on first attempts, then faster polling after
          const waitTime = attempts < 3 ? 3000 : 2000;
          setTimeout(() => pollPaymentStatus(attempts + 1, maxAttempts), waitTime);
        } catch (pollErr: any) {
          console.error(`[Poll ${attempts}] Error checking payment status:`, pollErr);
          // On error, retry with longer wait
          const waitTime = attempts < 3 ? 3000 : 2000;
          setTimeout(() => pollPaymentStatus(attempts + 1, maxAttempts), waitTime);
        }
      };

      // Start polling after initial 3-second wait for M-Pesa callback
      setTimeout(() => pollPaymentStatus(), 3000);
      
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
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
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
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
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
                    <svg className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      Outstanding balance of KES {status.current_balance.toLocaleString()}
                      {paymentPending && ' (Payment processing...)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={handlePayBalance}
                      disabled={loading}
                      className="inline-flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:hover:bg-yellow-600 rounded-md whitespace-nowrap transition-colors"
                    >
                      {loading ? (
                        <>
                          <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                          Processing...
                        </>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                    {paymentPending && (
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const newStatus = await client.get('/payments/bnpl/status/');
                            if (newStatus && newStatus.current_balance !== undefined) {
                              setStatus(newStatus);
                              setPaymentPending(false);
                              
                              const currentBalance = typeof newStatus.current_balance === 'string'
                                ? parseFloat(newStatus.current_balance)
                                : newStatus.current_balance;
                              
                              if (currentBalance === 0) {
                                showModal('Payment Successful', 'Your BNPL balance has been cleared!', 'success');
                                setError('');
                              } else if (currentBalance < (status?.current_balance || 0)) {
                                showModal('Payment Confirmed', `New balance: KES ${currentBalance.toLocaleString()}`, 'success');
                                setError('');
                              } else {
                                setError('Payment still processing. Please try again in a moment.');
                              }
                            }
                          } catch (err: any) {
                            setError('Failed to refresh balance');
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
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-red-800 dark:text-red-200 text-sm">
                  Split your order into 2 interest-free payments
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-red-700 dark:text-red-300">
                  <span className="inline-flex items-center">
                    <svg className="h-3.5 w-3.5 mr-1 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    No interest
                  </span>
                  <span className="inline-flex items-center">
                    <svg className="h-3.5 w-3.5 mr-1 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
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
                  <svg className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">Please add a phone number to enable BNPL</span>
                </div>
                <a
                  href="/profile"
                  className="inline-flex items-center justify-center sm:justify-start px-3 h-8 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 whitespace-nowrap flex-shrink-0"
                >
                  Update Profile
                  <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
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
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
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