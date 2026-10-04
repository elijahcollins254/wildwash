"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export default function RequestDeletionForm() {
  const { data: session, status: sessionStatus } = useSession();
  const [requestType, setRequestType] = useState("account");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const token = (session?.user as { token?: string } | undefined)?.token;
      if (!token) throw new Error("Your session is missing its sign-in token. Please sign out and sign in again.");

      const response = await fetch(`${API_BASE}/users/deletion-requests/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ request_type: requestType, details: details.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.details?.[0] || "Your request could not be submitted. Please try again.");
      }

      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Your request could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionStatus === "loading") {
    return <p className="py-8 text-slate-600 dark:text-slate-400">Checking your sign-in…</p>;
  }

  if (sessionStatus !== "authenticated") {
    return (
      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Sign in required</h2>
        <p className="mt-2 leading-7 text-slate-700 dark:text-slate-300">Sign in to verify account ownership before submitting a deletion request.</p>
        <Link href="/login?redirect=%2Frequest-deletion" className="mt-4 inline-flex rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">
          Sign in to continue
        </Link>
      </section>
    );
  }

  if (submitted) {
    return (
      <section role="status" className="mt-6 border-l-4 border-green-700 bg-green-50 p-5 text-green-950 dark:bg-green-950 dark:text-green-100">
        <h2 className="text-lg font-semibold">{requestType === "account" ? "Your account deletion request has been submitted" : "Your data deletion request has been submitted"}</h2>
        <p className="mt-2 leading-7">Wild Wash has received your request for review. Your account remains active until an account deletion request is reviewed and processed. We may contact you to verify the request or explain records that must be retained.</p>
      </section>
    );
  }

  return (
    <form onSubmit={submitRequest} className="mt-6 space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-400">Signed in as {(session.user as { email?: string } | undefined)?.email || session.user?.name || "your account"}</p>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">What would you like Wild Wash to delete?</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <input className="mt-1 accent-red-700" type="radio" name="requestType" value="account" checked={requestType === "account"} onChange={() => setRequestType("account")} />
          <span>
            <span className="block font-semibold">My account and eligible associated data</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">This will request account closure. You will lose access if the request is approved and processed.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <input className="mt-1 accent-red-700" type="radio" name="requestType" value="data" checked={requestType === "data"} onChange={() => setRequestType("data")} />
          <span>
            <span className="block font-semibold">Selected personal data only</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">Your account will remain active. Specify the data you want deleted below.</span>
          </span>
        </label>
      </fieldset>

      <label className="block text-sm font-medium">
        Details{requestType === "data" ? " (required)" : " (optional)"}
        <textarea className="mt-1 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900" value={details} onChange={(event) => setDetails(event.target.value)} required={requestType === "data"} maxLength={4000} placeholder="Describe the data you want deleted or add context for your request. Do not include passwords or payment credentials." />
      </label>

      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <button className="rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || (requestType === "data" && !details.trim())}>
        {submitting ? "Submitting request…" : "Submit deletion request"}
      </button>
    </form>
  );
}