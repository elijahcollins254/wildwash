"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useCreateInvestmentMutation } from '@/redux/services/apiSlice';
import type { RootState } from '@/redux/store';
import { FiCheck } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface InvestmentConfirmation {
  amount: number;
  plan: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  expectedReturn: number;
  expectedMonthlyReturn: number;
  lockupPeriod: string;
  maturityDate: string;
}

export default function InvestPage(): React.ReactElement {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [investmentConfirmation, setInvestmentConfirmation] = useState<InvestmentConfirmation | null>(null);
  
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userPhone = useSelector((state: RootState) => state.auth.user?.phone);
  const [createInvestment, { isLoading }] = useCreateInvestmentMutation();

  // Get API base URL
  const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE || '' : '';

  const investmentPlans = [
    {
      id: 'starter',
      name: 'Starter',
      minInvestment: 5000,
      expectedReturn: '15%',
      term: '12 months',
      description: 'Perfect for new investors starting their investment journey',
      features: [
        'Minimum investment of KSh 50,000',
        'Expected annual return of 15%',
        '12-month investment term',
        'Monthly interest payouts',
        'Flexible withdrawal options',
        'Dedicated investor support'
      ],
      color: 'blue'
    },
    {
      id: 'professional',
      name: 'Professional',
      minInvestment: 25000,
      expectedReturn: '18%',
      term: '12-24 months',
      description: 'For serious investors looking for higher returns',
      features: [
        'Minimum investment of KSh 250,000',
        'Expected annual return of 18%',
        '12-24 month flexible terms',
        'Bi-weekly interest payouts',
        'Priority withdrawal processing',
        'Personal account manager'
      ],
      color: 'purple'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      minInvestment: 100000,
      expectedReturn: '22%',
      term: '12-36 months',
      description: 'Premium investment package for institutional investors',
      features: [
        'Minimum investment of KSh 1,000,000',
        'Expected annual return of 22%',
        '12-36 month customizable terms',
        'Weekly interest payouts',
        'Immediate withdrawal access',
        'Executive advisor & tax planning'
      ],
      color: 'amber'
    }
  ];


  const calculateExpectedReturns = (amount: number, returnPercentage: string, months: number) => {
    const percentage = parseFloat(returnPercentage);
    const totalReturn = (amount * percentage) / 100;
    const monthlyReturn = totalReturn / 12;
    return { totalReturn, monthlyReturn };
  };

  const calculateMaturityDate = (plan: any) => {
    const now = new Date();
    const months = plan.id === 'starter' ? 12 : plan.id === 'professional' ? 18 : 24;
    now.setMonth(now.getMonth() + months);
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleInvest = async (plan: any) => {
    if (!isAuthenticated) {
      setError('Please login to invest');
      return;
    }

    const amount = parseFloat(investmentAmount);
    if (!amount || amount < plan.minInvestment) {
      setError(`Minimum investment is KSh ${plan.minInvestment.toLocaleString()}`);
      return;
    }

    setError(null);

    try {
      // Step 1: Create investment using Redux mutation
      const investmentData = await createInvestment({
        plan_type: plan.id,
        amount: amount
      }).unwrap();

      // Get auth token for STK push
      let authToken = '';
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('wildwash_auth_state');
        if (storedAuth) {
          const authState = JSON.parse(storedAuth);
          authToken = authState.token || '';
        }
      }

      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Step 2: Initiate STK push for payment
      const stkRes = await fetch(`${apiBase}/payments/mpesa/stk-push/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          phone: userPhone,
          amount: amount,
          order_id: `INVEST-${plan.id.toUpperCase()}-${investmentData.id}`,
          transactionDesc: `Wild Wash Investment - ${plan.name} Plan`,
          investmentPlan: plan.id,
          investmentAmount: amount,
          investmentId: investmentData.id
        })
      });

      if (!stkRes.ok) {
        throw new Error('Failed to initiate payment');
      }

      // Calculate returns
      const months = plan.id === 'starter' ? 12 : plan.id === 'professional' ? 18 : 24;
      const { totalReturn, monthlyReturn } = calculateExpectedReturns(amount, plan.expectedReturn, months);
      const maturityDate = calculateMaturityDate(plan);

      // Show confirmation
      setInvestmentConfirmation({
        amount,
        plan: plan.name,
        paymentStatus: 'pending',
        expectedReturn: totalReturn,
        expectedMonthlyReturn: monthlyReturn,
        lockupPeriod: plan.term,
        maturityDate
      });

      setSelectedPlan(null);
      setInvestmentAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const steps = [
    {
      number: '1',
      title: 'Register',
      description: 'Create your investor account on our platform'
    },
    {
      number: '2',
      title: 'Verify',
      description: 'Complete KYC verification process'
    },
    {
      number: '3',
      title: 'Invest',
      description: 'Choose your plan and make your first investment'
    },
    {
      number: '4',
      title: 'Earn',
      description: 'Start earning returns on your investment'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Investment Confirmation Modal */}
      {investmentConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4 animate-pulse">
                <FiCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">Investment Confirmed</h2>
              <p className="text-base text-slate-600 dark:text-slate-400">STK push sent to your phone</p>
            </div>

            <div className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Plan</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">{investmentConfirmation.plan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Amount</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">KSh {investmentConfirmation.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Lockup Period</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">{investmentConfirmation.lockupPeriod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Maturity Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">{investmentConfirmation.maturityDate}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Expected Annual</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+KSh {investmentConfirmation.expectedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Expected Monthly</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+KSh {investmentConfirmation.expectedMonthlyReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setInvestmentConfirmation(null);
                  // Navigate to dashboard
                  window.location.href = '/invest/dashboard';
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-full transition-colors">
                View Dashboard
              </button>
              <button
                onClick={() => setInvestmentConfirmation(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-3 px-4 rounded-full transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investment Amount Modal */}
      {selectedPlan && !investmentConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-6">Investment Amount</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Amount (KSh)</label>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => {
                  setInvestmentAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                className="w-full px-6 py-4 text-xl border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Minimum: KSh {investmentPlans.find(p => p.id === selectedPlan)?.minInvestment.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const plan = investmentPlans.find(p => p.id === selectedPlan);
                  if (plan) handleInvest(plan);
                }}
                disabled={isLoading || !investmentAmount}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2">
                {isLoading && <AiOutlineLoading3Quarters className="animate-spin h-5 w-5" />}
                {isLoading ? 'Processing' : 'Continue'}
              </button>
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setInvestmentAmount('');
                  setError(null);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-3 px-6 rounded-full transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!investmentConfirmation && (
        <>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Investment Plans */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-16 text-center">Investment Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {investmentPlans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
                  {plan.id === 'professional' && (
                    <div className="inline-block px-4 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full mb-4">Most Popular</div>
                  )}
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-base">{plan.description}</p>

                  <div className="space-y-4 mb-8 py-8 border-y border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-600 dark:text-slate-400">Minimum</span>
                      <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">KSh {(plan.minInvestment / 1000).toLocaleString()}K</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-600 dark:text-slate-400">Annual Return</span>
                      <span className="text-2xl font-semibold text-red-600 dark:text-red-400">{plan.expectedReturn}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-600 dark:text-slate-400">Term</span>
                      <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{plan.term}</span>
                    </div>
                  </div>

                  <div className="mb-8 space-y-3">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <FiCheck className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setError('Please login to invest');
                        return;
                      }
                      setSelectedPlan(plan.id);
                    }}
                    className={`w-full py-3 rounded-full font-semibold transition-colors ${
                      plan.id === 'professional'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-50'
                    }`}>
                    {selectedPlan === plan.id ? 'Selected' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-16 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-16 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: 'What is the minimum investment amount?',
                answer: 'The minimum investment varies by plan. Our Starter plan requires KSh 50,000, Professional plan requires KSh 250,000, and Enterprise plan requires KSh 1,000,000.'
              },
              {
                question: 'How often will I receive returns?',
                answer: 'Returns are paid out monthly for Starter plans, bi-weekly for Professional plans, and weekly for Enterprise plans.'
              },
              {
                question: 'Is my investment guaranteed?',
                answer: 'While we cannot guarantee returns, our investments are secured by our growing business operations and robust financial safeguards.'
              },
              {
                question: 'Can I withdraw my investment early?',
                answer: 'Yes, all plans offer flexible withdrawal options. Withdrawal processing times vary by plan tier, from immediate for Enterprise to standard for Starter plans.'
              },
              {
                question: 'What is the investment term?',
                answer: 'Terms range from 12 to 36 months depending on your chosen plan. You can select what works best for your financial goals.'
              },
              {
                question: 'How do I get started?',
                answer: 'Simply register on our platform, complete KYC verification, choose your investment plan, and make your first investment. Our team will guide you through every step.'
              }
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900 dark:text-slate-50 text-lg">
                  {faq.question}
                  <span className="transition-transform group-open:rotate-180 text-red-600">▼</span>
                </summary>
                <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-3xl p-16 text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Start Investing?</h2>
            <p className="text-lg text-red-50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of investors who are already growing their wealth with Wild Wash
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated && (
                <Link
                  href="/invest/dashboard"
                  className="px-8 py-4 bg-white text-red-600 rounded-full font-semibold hover:bg-red-50 transition-colors">
                  View My Investments
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  href="/register"
                  className="px-8 py-4 bg-white text-red-600 rounded-full font-semibold hover:bg-red-50 transition-colors">
                  Get Started
                </Link>
              )}
              <Link
                href="/contact"
                className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* Risk Disclaimer */}
        <section className="mb-20">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-8">
            <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-3 text-lg">⚠️ Important Disclaimer</h3>
            <p className="text-yellow-800 dark:text-yellow-200 leading-relaxed">
              Investments in Wild Wash carry risk. Past performance is not indicative of future results. Returns are not guaranteed. Please review all terms and conditions carefully before investing. Consult with a financial advisor if needed.
            </p>
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
