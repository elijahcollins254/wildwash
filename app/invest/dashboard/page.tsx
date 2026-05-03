"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { FiDollarSign, FiTrendingUp, FiX } from 'react-icons/fi';
import { useGetMyInvestmentsQuery, useGetInvestmentSummaryQuery } from '@/redux/services/apiSlice';
import type { RootState } from '@/redux/store';
import type { Investment, InvestmentSummary } from '@/redux/services/apiSlice';

export default function InvestmentDashboard(): React.ReactElement {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Fetch investments using Redux hooks
  const { data: investments = [], isLoading: investmentsLoading, error: investmentsError } = useGetMyInvestmentsQuery(undefined, {
    skip: !isAuthenticated
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useGetInvestmentSummaryQuery(undefined, {
    skip: !isAuthenticated
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPlanLabel = (planType: string) => {
    return planType.charAt(0).toUpperCase() + planType.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Please Login
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            You need to be logged in to view your investments
          </p>
          <Link
            href="/login"
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors">
            Login Now
          </Link>
        </div>
      </div>
    );
  }

  if (investmentsLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-red-600 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your investments...</p>
        </div>
      </div>
    );
  }

  const isLoading = investmentsLoading || summaryLoading;
  const error = investmentsError || summaryError;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                Investment Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Track your investments and expected returns
              </p>
            </div>
            <Link
              href="/invest"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors w-fit">
              New Investment
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <p className="text-red-700 dark:text-red-400">
              {typeof error === 'string' ? error : 'Failed to load investments'}
            </p>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Total Invested */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Total Invested
              </p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                KSh {summary.total_invested.toLocaleString()}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {summary.total_investments} investment{summary.total_investments !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Active Investments */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Active Now
              </p>
              <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {summary.active_investments}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Generating returns
              </p>
            </div>

            {/* Expected Returns */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Expected Annual Returns
              </p>
              <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                +KSh {Math.round(summary.total_expected_returns).toLocaleString()}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Before maturity
              </p>
            </div>

            {/* Received Returns */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Received Returns
              </p>
              <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                +KSh {Math.round(summary.total_received_returns).toLocaleString()}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Payouts received
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {investments.length === 0 && !error && (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full mb-4">
              <FiDollarSign className="w-8 h-8 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              No Investments Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Start building your investment portfolio. Choose a plan that matches your financial goals.
            </p>
            <Link
              href="/invest"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors inline-block">
              Make Your First Investment
            </Link>
          </div>
        )}

        {/* Investments List */}
        {investments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">
              Your Investments
            </h2>
            {investments.map((investment) => (
              <div
                key={investment.id}
                onClick={() => setSelectedInvestment(investment)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {getPlanLabel(investment.plan_type)} Plan
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(investment.status)}`}>
                        {getStatusLabel(investment.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-4">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          Invested
                        </p>
                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                          KSh {investment.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          Annual Return
                        </p>
                        <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                          +KSh {Math.round(investment.expected_annual_return).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          Monthly Return
                        </p>
                        <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                          +KSh {Math.round(investment.expected_monthly_return).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Start Date</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {formatDate(investment.investment_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Maturity Date</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {formatDate(investment.maturity_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Term</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {investment.lockup_period_months} months
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Time Left</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {investment.days_until_maturity} days
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="lg:w-48 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Progress
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {investment.progress_percentage}%
                        </p>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                          style={{ width: `${investment.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {investment.payout_frequency && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <p>• {investment.payout_frequency.charAt(0).toUpperCase() + investment.payout_frequency.slice(1)} payouts</p>
                        {investment.next_payout_date && (
                          <p>• Next: {formatDate(investment.next_payout_date)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investment Details Modal */}
      {selectedInvestment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {getPlanLabel(selectedInvestment.plan_type)} Plan
                </h2>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedInvestment.status)}`}>
                  {getStatusLabel(selectedInvestment.status)}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvestment(null)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Amount Invested</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  KSh {selectedInvestment.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Annual Return %</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {selectedInvestment.annual_return_percentage}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Term</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {selectedInvestment.lockup_period_months} months
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Start Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatDate(selectedInvestment.investment_date)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Maturity Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatDate(selectedInvestment.maturity_date)}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Expected Annual Return</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +KSh {Math.round(selectedInvestment.expected_annual_return).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Expected Monthly Return</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +KSh {Math.round(selectedInvestment.expected_monthly_return).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Received Returns</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    +KSh {Math.round(selectedInvestment.total_received_returns).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedInvestment(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-full transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
