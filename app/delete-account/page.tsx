import type { Metadata } from "next";
import DeletionRequestForm from "./DeletionRequestForm";

export const metadata: Metadata = {
  title: "Request Account or Data Deletion | Wild Wash",
  description: "Request deletion of your Wild Wash account or personal data.",
  robots: { index: true, follow: true },
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Wild Wash</p>
          <h1 className="mt-2 text-3xl font-bold">Request account or data deletion</h1>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
            Use this page to ask Wild Wash to close your account and delete associated personal data, or to delete selected data while keeping your account.
          </p>
        </header>

        <section className="border-b border-slate-200 py-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">What happens to your data</h2>
          <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
            After we verify your request, we will delete or de-identify eligible account details, contact and profile information, saved service/location details, and personal details associated with your service history, applications, and preferences. Closing your account removes your ability to sign in and use it.
          </p>
          <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
            We may retain payment and transaction records, relevant order or application records, and information needed for legal, tax, accounting, security, fraud-prevention, or dispute-resolution purposes. Retained information is limited to what is needed for the applicable purpose or obligation. Retention periods vary by record and applicable requirement; Wild Wash does not apply one fixed retention period to all records.
          </p>
          <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
            We review requests individually and may contact you to verify account ownership or clarify the request. Deletion is not immediate, and we will confirm the outcome by email. Do not include your password, M-Pesa PIN, or other payment credentials.
          </p>
        </section>

        <section className="py-6">
          <h2 className="text-xl font-semibold">Send a request</h2>
          <p className="mt-2 leading-7 text-slate-700 dark:text-slate-300">
            Choose what you want deleted and provide an email address or phone number linked to your account. The button opens an email addressed to Wild Wash support; your request is sent only after you send that email.
          </p>
          <DeletionRequestForm />
        </section>

        <p className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-400">
          Questions about this process? Email <a className="font-semibold text-red-700 underline dark:text-red-400" href="mailto:hello@wildwash.co">hello@wildwash.co</a> or read our <a className="font-semibold text-red-700 underline dark:text-red-400" href="/privacy">Privacy Policy</a>.
        </p>
      </article>
    </main>
  );
}