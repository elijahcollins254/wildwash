"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type OrderRating = {
  rating: number;
  comment: string;
  created_at: string;
};

function getAuthToken() {
  try {
    const authState = localStorage.getItem("wildwash_auth_state");
    return authState ? JSON.parse(authState).token as string | undefined : undefined;
  } catch (error) {
    console.error("Error reading authentication state:", error);
    return undefined;
  }
}

async function getErrorMessage(response: Response) {
  const data = await response.json().catch(() => null);
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.rating?.[0] === "string") return data.rating[0];
  if (typeof data?.comment?.[0] === "string") return data.comment[0];
  return `Request failed (${response.status})`;
}

export default function OrderRatingPage() {
  const { code } = useParams<{ code: string }>();
  const [savedRating, setSavedRating] = useState<OrderRating | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    let active = true;

    async function loadRating() {
      try {
        const token = getAuthToken();
        const response = await fetch(`${apiBase}/orders/${encodeURIComponent(code)}/rating/`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));

        const data = await response.json() as OrderRating | null;
        if (active && data) {
          setSavedRating(data);
          setRating(data.rating);
          setComment(data.comment);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this order rating.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (code) loadRating();
    return () => {
      active = false;
    };
  }, [apiBase, code]);

  async function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${apiBase}/orders/${encodeURIComponent(code)}/rating/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ rating, comment }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setSavedRating(await response.json() as OrderRating);
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your rating.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] px-4 py-12 text-slate-900 dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] dark:text-slate-100">
      <section className="mx-auto max-w-xl rounded-2xl bg-white/80 p-6 shadow dark:bg-white/5 sm:p-8">
        <Link href={`/orders/${encodeURIComponent(code)}`} className="text-sm text-red-600 hover:underline">
          ← Back to order
        </Link>
        <p className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">Order {code}</p>
        <h1 className="mt-1 text-3xl font-extrabold">Rate your order</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Tell us how we did. Your feedback helps us improve every wash.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-600 dark:text-slate-300">Loading rating...</p>
        ) : error && !savedRating && !rating ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : (
          <form onSubmit={submitRating} className="mt-8 space-y-6">
            <fieldset disabled={submitting}>
              <legend className="text-sm font-semibold">Your rating</legend>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Order rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                    onClick={() => setRating(value)}
                    className={`rounded-lg px-2 py-1 text-3xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                      value <= rating
                        ? "text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold" htmlFor="rating-comment">
              Comment <span className="font-normal text-slate-500">(optional)</span>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                rows={4}
                disabled={submitting}
                placeholder="What did you like, or what could we do better?"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
              <span className="mt-1 block text-right text-xs font-normal text-slate-500">
                {comment.length}/1000
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {success && (
              <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
                Thank you! Your rating has been saved.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {submitting ? "Submitting..." : savedRating ? "Update rating" : "Submit rating"}
            </button>
            {savedRating && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You can update this rating at any time.
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
