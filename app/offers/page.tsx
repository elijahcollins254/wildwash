"use client"

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BNPLManager from "../../components/BNPLManager";
import { client } from "../../lib/api/client";
import { getStoredAuthState } from "@/lib/auth";

type Offer = {
  id: number;
  title: string;
  description: string;
  image_url?: string | null;
  discount_percent: number;
  discount_amount: number;
  code: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  is_claimed: boolean;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const router = useRouter();

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is logged in and get subscription status
  useEffect(() => {
    const authState = getStoredAuthState();
    setIsLoggedIn(!!authState?.token);
    
    if (authState?.token) {
      // Check subscription status
      checkSubscriptionStatus();
    }
  }, []);

  async function checkSubscriptionStatus() {
    try {
      const response = await client.get('/offers/subscriptions/my_subscription');
      setSubscribed(response.is_subscribed ?? response.is_active ?? false);
    } catch (err) {
      console.error("Error checking subscription status:", err);
    }
  }

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true);
      setError(null);

      try {
        const response = await client.get('/offers');
        // Ensure we always have an array, even if empty
        const offersData = Array.isArray(response) ? response : response.results || [];
        setOffers(offersData);
        
        // Auto-claim offer after offers are loaded
        const params = new URLSearchParams(window.location.search);
        const offerId = params.get('claim_offer');
        
        if (offerId && isLoggedIn && offersData.length > 0) {
          const offerIdNum = parseInt(offerId, 10);
          // Use setTimeout to ensure state is updated
          setTimeout(() => {
            claimOfferDirectly(offerIdNum, offersData);
          }, 100);
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load offers");
        console.error("Error fetching offers:", err);
        // Ensure offers is always an array even on error
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOffers();
  }, [isLoggedIn]);

  async function claimOffer(id: number) {
    // Check if user is logged in
    if (!isLoggedIn) {
      // Redirect to login with the offer ID and return URL
      // Use URLSearchParams to properly encode the redirect_to parameter
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('redirect', `/offers?claim_offer=${id}`);
      router.push(loginUrl.pathname + loginUrl.search);
      return;
    }

    try {
      setClaimingId(id);
      await client.post(`/offers/${id}/claim`);

      // Refresh offers list to update claim status
      const updatedOffers = offers.map(offer => 
        offer.id === id ? { ...offer, is_claimed: true } : offer
      );
      setOffers(updatedOffers);
    } catch (err: any) {
      setError(err.message || "Failed to claim offer");
      console.error("Error claiming offer:", err);
    } finally {
      setClaimingId(null);
    }
  }

  // Direct claim function that doesn't depend on state (used for auto-claiming)
  async function claimOfferDirectly(id: number, offersData: Offer[]) {
    try {
      setClaimingId(id);
      await client.post(`/offers/${id}/claim`);

      // Update offers with the claimed status
      const updatedOffers = offersData.map(offer => 
        offer.id === id ? { ...offer, is_claimed: true } : offer
      );
      setOffers(updatedOffers);
    } catch (err: any) {
      setError(err.message || "Failed to claim offer");
      console.error("Error claiming offer:", err);
    } finally {
      setClaimingId(null);
    }
  }

  async function handleSubscriptionToggle() {
    if (!isLoggedIn) return;

    try {
      setLoadingSubscription(true);
      setError(null);
      setSuccessMessage(null);
      
      if (subscribed) {
        // Unsubscribe
        await client.post('/offers/subscriptions/unsubscribe');
        setSubscribed(false);
        setSuccessMessage('Unsubscribed from offer notifications');
      } else {
        // Subscribe
        await client.post('/offers/subscriptions/my_subscription');
        setSubscribed(true);
        setSuccessMessage('✓ You\'ll receive SMS notifications when new offers are available!');
      }
      
      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update subscription");
      console.error("Error toggling subscription:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }

  const filtered = offers.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.title.toLowerCase().includes(q) || 
      o.description.toLowerCase().includes(q) || 
      o.code.toLowerCase().includes(q) ||
      (o.discount_percent > 0 ? `${o.discount_percent}%`.includes(q) : '')
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold">Offers — This week</h1>
          {!isLoggedIn && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Log in to claim offers and start saving
            </p>
          )}
          {isLoggedIn && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {subscribed 
                ? "✓ You're subscribed to offer notifications via SMS" 
                : "Subscribe to receive SMS notifications when new offers are available"}
            </p>
          )}
        </header>

        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <section className="mb-6 flex gap-3 items-center">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search offers" className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300" />
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => handleSubscriptionToggle()} 
              disabled={loadingSubscription || !isLoggedIn}
              className={`px-3 py-2 rounded text-sm transition-colors ${subscribed ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-100 hover:bg-slate-200'} ${loadingSubscription ? 'opacity-50 cursor-not-allowed' : ''} ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingSubscription ? 'Loading...' : subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
            {isLoggedIn && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive SMS when offers are added
              </p>
            )}
          </div>
        </section>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BNPL Manager - only show if logged in */}
            {isLoggedIn && (
              <div className="rounded-2xl overflow-hidden">
                <BNPLManager />
              </div>
            )}

            {/* Offers list */}
            {loading ? (
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow text-sm text-slate-600">Loading offers…</div>
            ) : error ? (
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow text-sm text-slate-600">No offers found.</div>
            ) : (
              filtered.map((o) => (
                <article key={o.id} className="rounded-2xl bg-white/80 dark:bg-white/5 shadow flex flex-col overflow-hidden">
                  <Image
                    src={o.image_url || "/images/Clean%20Now%20Pay%20Later.png"}
                    alt={o.title}
                    width={1200}
                    height={630}
                    unoptimized
                    className="h-44 w-full object-cover"
                  />
                  <div className="p-4 flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{o.title}</div>
                        <div className="text-sm text-slate-600 mt-2">{o.description}</div>
                        <div className="mt-2 text-xs text-slate-500">Code: {o.code}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                          {o.discount_percent > 0
                            ? `${o.discount_percent}% OFF`
                            : `KSh ${o.discount_amount} OFF`}
                        </div>
                        {o.max_uses && (
                          <div className="text-xs text-slate-500 mt-2">
                            {o.max_uses - o.current_uses} of {o.max_uses} remaining
                          </div>
                        )}
                        {o.valid_until && (
                          <div className="text-xs text-slate-500 mt-1">
                            Expires {new Date(o.valid_until).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Link href={`/offers/${o.id}`} className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 text-sm">
                        View & share
                      </Link>
                      {o.is_claimed ? (
                        <div className="px-3 py-2 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                          Claimed ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => claimOffer(o.id)}
                          disabled={claimingId === o.id}
                          className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
                        >
                          {claimingId === o.id ? 'Claiming...' : 'Claim Offer'}
                        </button>
                      )}
                      <div className="ml-auto text-xs text-slate-500">
                        {o.current_uses} claimed
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
