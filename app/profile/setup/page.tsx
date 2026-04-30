"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { setAuth } from "@/redux/features/authSlice";
import RouteGuard from "@/components/RouteGuard";
import type { RootState } from "@/redux/store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface Location {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

interface ProfileSetupForm {
  first_name: string;
  last_name: string;
  phone: string;
  location: string;
  pickup_address: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
  pickup_address?: string;
}

const validators = {
  first_name: (value: string) => {
    if (!value) return "First name is required";
    if (value.length < 2) return "First name must be at least 2 characters";
    if (value.length > 50) return "First name must be less than 50 characters";
    return "";
  },
  last_name: (value: string) => {
    if (!value) return "Last name is required";
    if (value.length < 2) return "Last name must be at least 2 characters";
    if (value.length > 50) return "Last name must be less than 50 characters";
    return "";
  },
  phone: (value: string) => {
    if (!value) return "Phone number is required";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length < 10) return "Phone number must be at least 10 digits";
    if (!/^(?:254|0)7\d{8}$/.test(cleaned)) return "Please enter a valid Kenya phone number";
    return "";
  },
  location: (value: string) => {
    if (!value) return "Please select a location";
    return "";
  },
  pickup_address: (value: string) => {
    if (!value) return "Pickup address is required";
    if (value.length < 5) return "Pickup address must be at least 5 characters";
    if (value.length > 255) return "Pickup address must be less than 255 characters";
    return "";
  },
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<ProfileSetupForm>({
    first_name: "",
    last_name: "",
    phone: "",
    location: "",
    pickup_address: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [success, setSuccess] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // If profile is already complete, redirect to home
    if (user?.profile_complete) {
      router.push("/");
      return;
    }

    fetchLocations();
  }, [isAuthenticated, user?.profile_complete, router]);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch(`${API_BASE}/users/locations/`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      const locationsList = Array.isArray(data) ? data : (data.results || []);
      setLocations(locationsList);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setError("Failed to load service locations");
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    const fieldName = name as keyof ProfileSetupForm;
    const validator = validators[fieldName as keyof typeof validators];
    if (validator) {
      const error = validator(value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    Object.entries(formData).forEach(([key, value]) => {
      const validator = validators[key as keyof typeof validators];
      if (validator) {
        const error = validator(value as string);
        if (error) newErrors[key as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Get token from session or localStorage
      let token = null;
      const authState = localStorage.getItem('wildwash_auth_state');
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.token;
        } catch (e) {
          console.error('Error parsing auth state:', e);
        }
      }

      const response = await fetch(`${API_BASE}/users/profile/setup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Token ${token}` }),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || body || `Status ${response.status}`);
      }

      const data = await response.json();
      
      // Update Redux with the updated user data
      if (data.user) {
        dispatch(setAuth({
          user: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            phone: data.user.phone,
            role: data.user.role,
            is_staff: data.user.is_staff,
            is_superuser: data.user.is_superuser,
            profile_complete: true,
          },
          token: user?.id, // Use existing token
        }));
      }

      setSuccess(true);
      
      // Redirect to home after success
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      console.error("Error completing profile setup:", err);
      setError(err?.message ?? "Failed to complete profile setup");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold mb-2">Profile Complete!</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Your profile has been successfully set up. Redirecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
        <div className="max-w-md mx-auto px-4">
          <header className="mb-6">
            <h1 className="text-2xl font-extrabold">Complete Your Profile</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              We need some information to get you started. This is required before placing your first order.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow space-y-4">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500">First Name</label>
              <input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border ${errors.first_name ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="Enter your first name"
                autoComplete="given-name"
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.first_name}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500">Last Name</label>
              <input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border ${errors.last_name ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="Enter your last name"
                autoComplete="family-name"
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.last_name}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500">Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border ${errors.phone ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="07123456789"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                Service Location
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={loadingLocations || locations.length === 0}
                className={`mt-1 w-full rounded-lg border-2 transition-all duration-200 ${
                  errors.location || !locations.length
                    ? "border-red-500 focus:border-red-600"
                    : "border-slate-200 dark:border-slate-700 focus:border-red-500"
                } bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-0 dark:focus:ring-red-400 appearance-none cursor-pointer`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23${
                    errors.location ? "dc2626" : formData.location ? "1f2937" : "9ca3af"
                  }' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px',
                }}
              >
                <option value="">
                  {loadingLocations ? "Loading locations..." : locations.length === 0 ? "No locations available" : "Select a location"}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors.location && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.location}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500">Pickup Address</label>
              <input
                name="pickup_address"
                value={formData.pickup_address}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border ${errors.pickup_address ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="Enter your default pickup address"
                autoComplete="street-address"
              />
              {errors.pickup_address && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.pickup_address}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="flex-1 rounded-md bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin -ml-1 mr-2"></span>
                    Completing setup...
                  </span>
                ) : (
                  "Complete Setup"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-md border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-medium transition-colors"
              >
                Skip for now
              </button>
            </div>
          </form>

          <p className="mt-6 text-xs text-slate-600 dark:text-slate-400 text-center">
            You can update this information in your profile settings at any time.
          </p>
        </div>
      </div>
    </RouteGuard>
  );
}
