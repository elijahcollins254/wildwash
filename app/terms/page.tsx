"use client";

import React from "react";
import Link from "next/link";

export default function TermsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/borrow" className="text-red-600 hover:text-red-700 font-semibold mb-4 inline-flex items-center gap-2">
            ← Back to Borrow
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Loan Terms & Conditions
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Please read and understand these terms before applying for a loan
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 space-y-8">
          {/* 1. Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Eligibility Requirements</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>To be eligible for a loan from Wildwash, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years old</li>
                <li>Have a valid and verified Wildwash account</li>
                <li>Have completed at least one service order with Wildwash (for order-based loans)</li>
                <li>Have no outstanding loans or payment defaults</li>
                <li>Provide valid identification and proof of address</li>
                <li>Have a good standing with Wildwash (no service cancellations or disputes)</li>
              </ul>
            </div>
          </section>

          {/* 2. Loan Types */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Types of Loans</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Order-Based Loans</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Loans secured by your completed or ready Wildwash service orders. You can borrow up to 60% of the total value of your selected order as collateral.
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Collateral-Based Loans</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Loans secured by other assets such as property, vehicles, equipment, or other valuables. Maximum loan amount is determined by the estimated value and type of collateral provided.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Loan Amount & Limits */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Loan Amount & Limits</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p><strong>Order-Based Loans:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maximum Loan-to-Value (LTV): 60% of order value</li>
                <li>Minimum Loan Amount: KSh 500</li>
                <li>Maximum Loan Amount: KSh 500,000 (subject to verification)</li>
              </ul>
              <p className="mt-4"><strong>Collateral-Based Loans:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maximum LTV: Varies by collateral type (50-75%)</li>
                <li>Property: Up to 60% of estimated value</li>
                <li>Vehicles: Up to 70% of estimated value</li>
                <li>Equipment/Other: Up to 50% of estimated value</li>
              </ul>
            </div>
          </section>

          {/* 4. Interest Rates */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Interest Rates & Fees</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p><strong>Interest Rate:</strong> 2% per day (compounding daily)</p>
              <p>
                Example: A loan of KSh 10,000 for 30 days:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Daily Interest: KSh 200</li>
                <li>Total Interest for 30 days: KSh 6,000</li>
                <li>Total Repayment: KSh 16,000</li>
              </ul>
              <p className="mt-4"><strong>Additional Fees:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Processing Fee: 2% of loan amount</li>
                <li>Late Payment Fee: 5% per month of outstanding balance</li>
                <li>Early Repayment: No penalty</li>
              </ul>
            </div>
          </section>

          {/* 5. Loan Duration */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Loan Duration</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>Available loan periods:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>30 days</li>
                <li>60 days</li>
                <li>90 days</li>
                <li>6 months (180 days)</li>
              </ul>
              <p className="mt-4">
                Loan terms can be extended by mutual agreement. Extension requests must be submitted at least 5 days before the loan maturity date.
              </p>
            </div>
          </section>

          {/* 6. Collateral Requirements */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">6. Collateral Requirements</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p><strong>Order-Based Collateral:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Order must be in "Delivered" or "Ready" status</li>
                <li>Order value must be clearly documented in the system</li>
                <li>Cannot be used as collateral for multiple loans simultaneously</li>
              </ul>
              <p className="mt-4"><strong>Physical Collateral (Property, Vehicles, etc.):</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Proof of ownership required (title deed, registration certificate, etc.)</li>
                <li>Collateral must be free from any legal disputes</li>
                <li>Valuation will be conducted by a certified appraiser</li>
                <li>Insurance may be required for high-value items</li>
              </ul>
            </div>
          </section>

          {/* 7. Guarantor Requirements */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">7. Guarantor Requirements</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>At least one guarantor is required for each loan. The guarantor must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years old</li>
                <li>Have a verifiable source of income</li>
                <li>Provide valid identification documents</li>
                <li>Have no outstanding loans or legal issues</li>
                <li>Be willing to assume liability for loan repayment if the borrower defaults</li>
                <li>Provide contact information (phone number and email)</li>
              </ul>
              <p className="mt-4">
                The guarantor's relationship to the borrower should be clearly stated (e.g., friend, family member, employer).
              </p>
            </div>
          </section>

          {/* 8. Loan Approval Process */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">8. Loan Approval Process</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>Your loan application will be processed as follows:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li><strong>Application Submission:</strong> Submit your loan request with all required documents</li>
                <li><strong>Initial Review:</strong> Our team will verify your eligibility (24 hours)</li>
                <li><strong>Collateral Verification:</strong> Collateral value will be assessed (24-48 hours)</li>
                <li><strong>Credit Check:</strong> Background and credit verification (24 hours)</li>
                <li><strong>Approval/Rejection:</strong> You will be notified via email and SMS</li>
                <li><strong>Funds Disbursement:</strong> Upon approval, funds will be transferred within 24 hours</li>
              </ol>
              <p className="mt-4 text-red-600 dark:text-red-400 font-semibold">
                Total approval time: Up to 24 hours
              </p>
            </div>
          </section>

          {/* 9. Repayment Terms */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">9. Repayment Terms</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                <strong>Full Repayment:</strong> The entire loan amount plus accrued interest and fees must be repaid by the maturity date.
              </p>
              <p>
                <strong>Repayment Methods:</strong> Multiple options including bank transfer, mobile money (M-Pesa, Airtel Money), and in-person payment at Wildwash offices.
              </p>
              <p>
                <strong>Early Repayment:</strong> You may repay the loan in full at any time without penalties. Interest will be calculated only for the period the loan was outstanding.
              </p>
              <p>
                <strong>Payment Schedule:</strong> You will receive payment reminders via SMS and email 7 days before maturity and 1 day before maturity.
              </p>
            </div>
          </section>

          {/* 10. Default & Consequences */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">10. Default & Consequences</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                <strong>Late Payment:</strong> If payment is not made within 5 days of maturity, a late fee of 5% per month will be applied to the outstanding balance.
              </p>
              <p>
                <strong>Default:</strong> If payment is not made within 30 days of maturity, the loan will be considered in default.
              </p>
              <p><strong>Consequences of Default:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Immediate collateral seizure and liquidation</li>
                <li>Legal action against borrower and guarantors</li>
                <li>Reporting to credit reference bureaus</li>
                <li>Suspension of Wildwash services</li>
                <li>Criminal prosecution for fraud (if applicable)</li>
              </ul>
            </div>
          </section>

          {/* 11. Collateral Release */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">11. Collateral Release</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Upon full repayment of the loan (principal + interest + fees), the collateral will be released within 5 business days. You will receive a formal release certificate.
              </p>
              <p>
                <strong>Order Collateral:</strong> The order will be available for use in future loan applications once released.
              </p>
              <p>
                <strong>Physical Collateral:</strong> A formal release document will be issued, and ownership will be fully transferred back to you.
              </p>
            </div>
          </section>

          {/* 12. Data Privacy & Security */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">12. Data Privacy & Security</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Wildwash uses reasonable safeguards to protect personal and financial information. We share information with service providers and other parties when needed to provide services, process payments, meet legal obligations, or protect people and property, as explained in our Privacy Policy. We do not sell personal information.
              </p>
              <p className="mt-4">
                For more details, please refer to our <Link href="/privacy" className="text-red-600 hover:text-red-700 underline">Privacy Policy</Link>.
              </p>
            </div>
          </section>

          {/* 13. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">13. Dispute Resolution</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                If you have a dispute regarding your loan, please follow these steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Contact our customer support team within 10 days of the dispute</li>
                <li>Provide detailed documentation of the issue</li>
                <li>Our team will investigate and respond within 5 business days</li>
                <li>If unresolved, the matter may be escalated to our dispute resolution committee</li>
                <li>Final resolution can be appealed to relevant regulatory authorities</li>
              </ol>
            </div>
          </section>

          {/* 14. Amendments & Changes */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">14. Amendments & Changes</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Wildwash reserves the right to amend these terms and conditions at any time. Changes will be:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Communicated via email at least 30 days in advance</li>
                <li>Posted on the Wildwash website</li>
                <li>Applied only to new loan applications unless otherwise specified</li>
              </ul>
              <p className="mt-4">
                Continued use of the loan service constitutes acceptance of amended terms.
              </p>
            </div>
          </section>

          {/* 15. Contact & Support */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">15. Contact & Support</h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>For questions or support regarding your loan:</p>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-2">
                <p><strong>Email:</strong> loans@wildwash.co.ke</p>
                <p><strong>Phone:</strong> +254 (0) 123 456 789</p>
                <p><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 6:00 PM EAT</p>
                <p><strong>Whatsapp:</strong> +254 (0) 123 456 789</p>
              </div>
            </div>
          </section>

          {/* Acceptance */}
          <section className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Acknowledgment</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              By applying for a loan through Wildwash, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. You also acknowledge that you have provided accurate information and understand the risks associated with borrowing.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Last Updated: November 29, 2025
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center space-y-4">
          <Link href="/borrow" className="inline-block px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all">
            Back to Borrow
          </Link>
          <p className="text-slate-600 dark:text-slate-400">
            Have questions? Contact our support team at loans@wildwash.co.ke
          </p>
        </div>
      </div>
    </div>
  );
}
