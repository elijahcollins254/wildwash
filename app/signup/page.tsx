"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAuth } from "@/redux/features/authSlice";
import { signIn } from "next-auth/react";
import { handleLogin, LOGIN_ENDPOINTS } from '@/lib/api/loginHelpers';
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

// Validators
const validators = {
  username: (value: string) => {
    if (!value) return "Username is required";
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 30) return "Username must be less than 30 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Username can only contain letters, numbers, and underscores";
    return "";
  },
  phone: (value: string) => {
    if (!value) return "Phone number is required";
    // Accept Kenya formats: 07xxxxxxxxx, 2547xxxxxxxxx, +2547xxxxxxxxx
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length < 10) return "Phone number must be at least 10 digits";
    if (!/^(?:254|0)7\d{8}$/.test(cleaned)) return "Please enter a valid Kenya phone number";
    return "";
  },
  password: (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(value)) return "Password must contain at least one number";
    return "";
  },
  confirmPassword: (password: string, confirmPassword: string) => {
    if (!confirmPassword) return "Confirm password is required";
    if (password !== confirmPassword) return "Passwords do not match";
    return "";
  },
  location: (value: string) => {
    if (!value) return "Please select a location";
    return "";
  },
};

// Validators for single parameter fields
const singleParamValidators = {
  username: validators.username,
  phone: validators.phone,
  location: validators.location,
};

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    location: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    location: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example hard-coded locations - replace with API call if you have a locations endpoint
  const locations = ["Juja", "Thika", "Makongeni", "Runda", "Wendani", "KM"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    const newErrors = { ...errors };
    if (name === "confirmPassword") {
      newErrors.confirmPassword = validators.confirmPassword(formData.password, value);
    } else if (name === "password") {
      newErrors.password = validators.password(value);
      // Also revalidate confirmPassword if it exists
      if (formData.confirmPassword) {
        newErrors.confirmPassword = validators.confirmPassword(value, formData.confirmPassword);
      }
    } else {
      newErrors[name as keyof typeof singleParamValidators] = singleParamValidators[name as keyof typeof singleParamValidators]?.(value) || "";
    }
    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors = {
      username: validators.username(formData.username),
      phone: validators.phone(formData.phone),
      password: validators.password(formData.password),
      confirmPassword: validators.confirmPassword(formData.password, formData.confirmPassword),
      location: validators.location(formData.location),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          phone: formData.phone,
          password: formData.password,
          location: formData.location,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || body || `Status ${res.status}`);
      }

      // After successful registration, attempt to login via our shared helper so
      // the auth state is persisted consistently (AUTH_STORAGE_KEY)
      const loginResult = await handleLogin(LOGIN_ENDPOINTS.USER, { username: formData.username, password: formData.password }, dispatch);
      if (loginResult.success) {
        router.push("/");
        return;
      }

      // If helper fails for some reason, fall back to redirecting to login
      router.push("/login");
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setLoading(true);
    console.log('[GoogleSignUp] Starting Google sign-up...');
    try {
      const result = await signIn('google', { redirect: false });
      console.log('[GoogleSignUp] signIn result:', result);
      
      if (result?.error) {
        console.error('[GoogleSignUp] signIn error:', result.error);
        setError(result.error || "Google sign-up failed");
        setLoading(false);
        return;
      }
      
      if (result?.ok) {
        console.log('[GoogleSignUp] Google sign-up successful, fetching session...');
        // Fetch session to get user data
        const response = await fetch('/api/auth/session');
        console.log('[GoogleSignUp] Session response status:', response.status);
        
        if (!response.ok) {
          console.error('[GoogleSignUp] Failed to fetch session:', response.statusText);
          setError('Failed to fetch session data');
          setLoading(false);
          return;
        }
        
        const session = await response.json();
        console.log('[GoogleSignUp] Session data:', session);
        
        if (session?.user) {
          console.log('[GoogleSignUp] User data from session:', session.user);
          // Update Redux with user data from session
          const userData = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.name,
            phone: session.user.phone,
            role: session.user.role,
            is_staff: session.user.role === 'washer' || session.user.role === 'folder',
            is_superuser: session.user.role === 'admin',
            staff_type: session.user.staff_type,
          };
          
          console.log('[GoogleSignUp] Dispatching setAuth with userData:', userData);
          dispatch(setAuth({
            user: userData,
            token: session.user.token,
          }));
          
          console.log('[GoogleSignUp] Redirecting to home...');
          // Redirect to home - the app will handle role-based redirect
          router.push('/');
        } else {
          console.error('[GoogleSignUp] No user data in session');
          setError('No user data received from Google');
          setLoading(false);
        }
      } else {
        console.warn('[GoogleSignUp] signIn result not ok:', result);
        setError('Google sign-up failed - please try again');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[GoogleSignUp] Catch error:', err);
      setError(err.message || "Google sign-up failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold">Create an account</h1>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <span className="h-4 w-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin -ml-1 mr-2"></span>
                Creating account with Google...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                </svg>
                Sign up with Google
              </>
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Or create account manually</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Username</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`mt-1 w-full rounded-md border ${errors.username ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
              placeholder="Choose a username"
              autoComplete="username"
            />
            {errors.username && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username}</p>}
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
            {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-500">Location</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`mt-1 w-full rounded-md border ${errors.location ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
            >
              <option value="">Select a location</option>
              {locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {errors.location && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.location}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-500">Password</label>
            <div className="mt-1 relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                className={`w-full rounded-md border ${errors.password ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="Create a password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-500"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-500">Confirm Password</label>
            <div className="mt-1 relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full rounded-md border ${errors.confirmPassword ? "border-red-500" : "dark:border-slate-800"} bg-white dark:bg-slate-900 px-3 py-2 text-sm`}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-pressed={showConfirmPassword}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-500"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
              <p className="text-xs mt-1">Check browser console (F12) for more details</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ username: "", phone: "", password: "", confirmPassword: "", location: "" });
                setErrors({ username: "", phone: "", password: "", confirmPassword: "", location: "" });
                setError(null);
              }}
              className="rounded-md border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm"
            >
              Clear
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-300 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-red-600 hover:text-red-500">
            Sign in instead
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
