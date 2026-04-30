"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { logout } from "@/redux/features/authSlice";
import RouteGuard from "@/components/RouteGuard";
import type { RootState } from "@/redux/store";
import { client } from "@/lib/api/client";
import { Spinner } from "@/components";

type UserProfile = {
  id: number;
  username: string;
  phone: string;
  first_name: string;
  last_name: string;
  location: string;
  pickup_address?: string;
}

type ServiceLocation = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

type Offer = {
  id: number;
  title: string;
  description: string;
  discount_amount: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

type UserOffer = {
  id: number;
  offer: Offer;
  claimed_at: string;
  is_used: boolean;
}

type SubscriptionFrequency = 'weekly' | 'bi-weekly' | 'monthly';

type Subscription = {
  id: number;
  frequency: SubscriptionFrequency;
  active: boolean;
  next_pickup_date: string;
}

type OffersSubscription = {
  id: number;
  user: number;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [userOffers, setUserOffers] = useState<UserOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [offersSubscribed, setOffersSubscribed] = useState(false);
  const [loadingOffersSubscription, setLoadingOffersSubscription] = useState(false);
  const [offersSubscriptionError, setOffersSubscriptionError] = useState<string | null>(null);
  
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const [isProfileComplete, setIsProfileComplete] = useState(user?.profile_complete || false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Auto-enter edit mode if profile is incomplete
    if (!isProfileComplete) {
      setEditMode(true);
    }

    fetchLocations();
    fetchProfile();
    fetchUserOffers();
    fetchSubscription();
    checkOffersSubscriptionStatus();
  }, [isAuthenticated, router]);

  const checkOffersSubscriptionStatus = async () => {
    try {
      const response = await client.get('/offers/subscriptions/my_subscription');
      setOffersSubscribed(response.is_subscribed ?? response.is_active ?? false);
    } catch (err) {
      console.error("Error checking offers subscription status:", err);
    }
  };

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await client.get('/users/locations/');
      // Handle paginated response
      const locationsList = Array.isArray(response) ? response : (response.results || []);
      setLocations(locationsList as ServiceLocation[]);
      console.log('[Profile] Locations fetched:', locationsList);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOffersSubscriptionToggle = async () => {
    try {
      setLoadingOffersSubscription(true);
      setOffersSubscriptionError(null);
      
      if (offersSubscribed) {
        // Unsubscribe
        await client.post('/offers/subscriptions/unsubscribe');
        setOffersSubscribed(false);
      } else {
        // Subscribe
        await client.post('/offers/subscriptions/my_subscription');
        setOffersSubscribed(true);
      }
    } catch (err: any) {
      setOffersSubscriptionError(err.message || "Failed to update subscription");
      console.error("Error toggling offers subscription:", err);
    } finally {
      setLoadingOffersSubscription(false);
    }
  };

  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    setSubscriptionError(null);
    try {
      const data = await client.get('/user/me/subscription/');
      setSubscription(data || null);
    } catch (err: any) {
      setSubscriptionError(err.message || "Failed to load subscription details");
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSubscriptionUpdate = async (frequency: SubscriptionFrequency) => {
    setLoadingSubscription(true);
    setSubscriptionError(null);
    try {
      const data = await client.post('/user/me/subscription/', { frequency });
      setSubscription(data);
    } catch (err: any) {
      setSubscriptionError(err.message || "Failed to update subscription");
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoadingSubscription(true);
    setSubscriptionError(null);
    try {
      await client.delete('/user/me/subscription/');
      setSubscription(null);
    } catch (err: any) {
      setSubscriptionError(err.message || "Failed to cancel subscription");
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchUserOffers = async () => {
    setLoadingOffers(true);
    setOffersError(null);
    try {
      const data = await client.get('/offers/user-offers');
      setUserOffers(data.results || []);
    } catch (err: any) {
      setOffersError(err.message || "Failed to load offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.get('/users/me/');
      setProfile(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = await client.patch('/users/me/', formData);
      setProfile(data);
      setEditMode(false);
      
      // If profile was incomplete and now has all required fields, update Redux
      if (!isProfileComplete && data.first_name && data.last_name && data.phone && data.location && data.pickup_address) {
        dispatch(setAuth({
          user: {
            ...user!,
            profile_complete: true,
          },
          token: user?.id,
        }));
        setIsProfileComplete(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    dispatch(logout());
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-2xl mx-auto px-4 flex justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold">Your Profile</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Manage your personal information and preferences.
            </p>
          </header>

          {/* Profile Completion Banner */}
          {!isProfileComplete && (
            <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">Complete Your Profile</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Please fill in all your profile details below to get started. This information is required before you can place orders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    disabled={!editMode && isProfileComplete}
                    className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    disabled={!editMode && isProfileComplete}
                    className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ""}
                    onChange={handleChange}
                    disabled={!editMode && isProfileComplete}
                    className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ""}
                    onChange={handleChange}
                    disabled={!editMode && isProfileComplete}
                    className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Service Location</label>
                  <select
                    name="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                    disabled={!editMode && isProfileComplete}
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 transition-all duration-200 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-0 dark:focus:ring-red-400 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px',
                    }}
                  >
                    <option value="">
                      {loadingLocations ? "Loading locations..." : "Select a service location"}
                    </option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                        {loc.description && ` - ${loc.description}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Default Pickup Address</label>
                  <textarea
                    name="pickup_address"
                    value={formData.pickup_address || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickup_address: e.target.value }))}
                    disabled={!editMode && isProfileComplete}
                    placeholder="e.g., Olive Towers, 4th floor, Nairobi"
                    rows={3}
                    className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">This address will be pre-filled when you book a pickup, but you can change it anytime.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">
                {editMode || !isProfileComplete ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(profile || {});
                        setEditMode(false);
                      }}
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-md border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <span className="inline-flex items-center">
                          <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                          Saving...
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-500"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8">
            <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Pickup Subscription</h2>
              
              {subscriptionError && (
                <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                  {subscriptionError}
                </div>
              )}

              {loadingSubscription ? (
                <div className="flex justify-center py-4">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : subscription ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Current Subscription</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)} pickups
                        </p>
                        {subscription.next_pickup_date && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Next pickup: {new Date(subscription.next_pickup_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={loadingSubscription}
                        className="px-4 py-2 text-sm rounded-md border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Subscribe to regular Wild Wash pickups and never worry about scheduling again.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['weekly', 'bi-weekly', 'monthly'] as SubscriptionFrequency[]).map((frequency) => (
                      <button
                        key={frequency}
                        onClick={() => handleSubscriptionUpdate(frequency)}
                        disabled={loadingSubscription}
                        className="p-4 rounded-lg border-0 bg-red-600 dark:bg-red-600 hover:bg-red-500 dark:hover:bg-red-500 text-left transition-all group hover:-translate-y-0.5"
                      >
                        <h3 className="font-medium capitalize text-white">{frequency} Pickup</h3>
                        <p className="text-sm text-white/90 mt-1">
                          Regular pickups every {frequency === 'bi-weekly' ? 'two weeks' : frequency.replace('ly', '')}
                        </p>
                        <span className="block mt-2 text-sm font-medium text-white group-hover:text-white/90">
                          Select Plan →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Claimed Offers</h2>
                <button
                  onClick={fetchUserOffers}
                  disabled={loadingOffers}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  {loadingOffers ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {offersError && (
                <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                  {offersError}
                </div>
              )}

              {loadingOffers ? (
                <div className="flex justify-center py-8">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : userOffers.length > 0 ? (
                <div className="space-y-3">
                  {userOffers.map((userOffer) => (
                    <div
                      key={userOffer.id}
                      className="p-4 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{userOffer.offer.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {userOffer.offer.description}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Claimed on: {new Date(userOffer.claimed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-bold text-red-600">
                            {userOffer.offer.discount_amount}% OFF
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full mt-1 ${
                            userOffer.is_used
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          }`}>
                            {userOffer.is_used ? 'Used' : 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p>You haven't claimed any offers yet.</p>
                  <a
                    href="/offers"
                    className="inline-block mt-2 text-sm text-red-600 hover:text-red-500"
                  >
                    Browse Available Offers
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Offer Notifications</h2>
              
              {offersSubscriptionError && (
                <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                  {offersSubscriptionError}
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Subscribe to receive SMS notifications when new offers are available. You'll get updates about discounts and exclusive deals right to your phone.
                </p>
                
                <div className="p-4 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">SMS Notifications</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {offersSubscribed ? 'You will receive SMS notifications about new offers' : 'Subscribe to get notified about new offers via SMS'}
                    </p>
                  </div>
                  <button
                    onClick={handleOffersSubscriptionToggle}
                    disabled={loadingOffersSubscription}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      offersSubscribed
                        ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50'
                    } ${
                      loadingOffersSubscription ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {loadingOffersSubscription ? 'Loading...' : offersSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <BNPLManager />
          </div>

          {/* Logout Button - Mobile Only */}
          <div className="mt-8 md:hidden">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

import BNPLManager from '@/components/BNPLManager';