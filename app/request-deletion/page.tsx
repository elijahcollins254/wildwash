import type { Metadata } from "next";
import RequestDeletionForm from "./RequestDeletionForm";

export const metadata: Metadata = {
  title: "Submit Account or Data Deletion Request | Wild Wash",
  description: "Sign in to submit a Wild Wash account or personal data deletion request.",
  robots: { index: true, follow: true },
};

export default function RequestDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Wild Wash</p>
          <h1 className="mt-2 text-3xl font-bold">Submit a deletion request</h1>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
            You must be signed in to request deletion. Wild Wash will review your request and contact you if verification or clarification is needed. Your account is not deleted automatically when you submit this form.
          </p>
        </header>
        <RequestDeletionForm />
      </article>
    </main>
  );
}