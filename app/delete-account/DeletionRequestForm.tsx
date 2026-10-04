"use client";

import { useState } from "react";

export default function DeletionRequestForm() {
  const [scope, setScope] = useState("account");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = scope === "account"
      ? "Wild Wash account deletion request"
      : "Wild Wash personal data deletion request";
    const requestType = scope === "account"
      ? "Please close my Wild Wash account and delete eligible associated personal data."
      : "Please delete the personal data described below while keeping my Wild Wash account active.";
    const body = [
      requestType,
      "",
      `Account email: ${email || "Not provided"}`,
      `Account phone: ${phone || "Not provided"}`,
      "",
      "Details or data to delete:",
      details || (scope === "data" ? "Please delete all personal data that is not required to be retained." : "Please delete all eligible personal data associated with my account."),
    ].join("\n");

    window.location.href = `mailto:hello@wildwash.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={submitRequest} className="mt-5 space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Request type</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <input className="mt-1 accent-red-700" type="radio" name="scope" value="account" checked={scope === "account"} onChange={() => setScope("account")} />
          <span>
            <span className="block font-semibold">Close my account</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">Delete my account and eligible associated personal data.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <input className="mt-1 accent-red-700" type="radio" name="scope" value="data" checked={scope === "data"} onChange={() => setScope("data")} />
          <span>
            <span className="block font-semibold">Delete selected data only</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">Keep my account active and tell Wild Wash which data to delete.</span>
          </span>
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Account email address
          <input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block text-sm font-medium">
          Account phone number
          <input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone linked to your account" />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Data to delete or additional details
        <textarea className="mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="For example, saved profile details or a specific request. Do not include passwords or payment credentials." />
      </label>

      <button className="rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2" type="submit" disabled={!email.trim() && !phone.trim()}>
        Prepare deletion request email
      </button>
      {!email.trim() && !phone.trim() ? <p className="text-sm text-slate-600 dark:text-slate-400">Enter the email address or phone number on your account to continue.</p> : null}
    </form>
  );
}