'use client';

import { FiUser, FiCreditCard, FiCalendar, FiCheck } from 'react-icons/fi';
import { BNPLManager } from '@/components';

export default function BNPLHelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buy Now, Pay Later (BNPL)</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Split your car wash payments into manageable installments with zero interest.
            </p>
          </div>

          {/* BNPL Manager Component */}
          <div className="mb-8">
            <BNPLManager />
          </div>

          {/* How It Works */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How It Works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded-full w-fit">
                  <FiUser className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">1. Enroll</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Sign up with your phone number for instant approval. No credit checks or lengthy applications needed.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded-full w-fit">
                  <FiCreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">2. Split Payment</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Pay 50% upfront at checkout, and the remaining 50% in your next payment. No hidden fees or interest charges.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded-full w-fit">
                  <FiCalendar className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">3. Flexible Schedule</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Choose your preferred payment date within 14 days. Get reminders before payments are due.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">What happens if I miss a payment?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  If you miss a payment, your BNPL service will be temporarily suspended until the payment is cleared. We'll send you reminders before and after the due date. No late fees are charged, but continued missed payments may affect your future eligibility.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Can I pay early?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Yes! You can pay your remaining balance at any time with no penalties or extra fees. Early payments help maintain a good payment history and may increase your credit limit over time.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">What's the maximum credit limit?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Initial credit limits start at KES 2,000 and can increase up to KES 10,000 based on your payment history and usage patterns. Regular on-time payments help build your credit limit over time.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">How do I opt out of BNPL?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  You can opt out of BNPL at any time through your account settings, provided you have no outstanding balance. Once opted out, you can always re-enroll later if needed.
                </p>
              </div>
            </div>
          </section>

          {/* Terms and Conditions Summary */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Terms & Conditions</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <FiCheck className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                  Must be 18 years or older with a valid phone number to enroll
                </li>
                <li className="flex items-start">
                  <FiCheck className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                  50% of the total amount is due at the time of service
                </li>
                <li className="flex items-start">
                  <FiCheck className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                  Remaining balance must be paid within 14 days
                </li>
                <li className="flex items-start">
                  <FiCheck className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                  Service may be suspended for missed payments
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}