"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { handleLogin, LOGIN_ENDPOINTS } from "@/lib/api/loginHelpers";
import { Spinner } from "@/components";
import type { RootState } from "@/redux/store";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const user = useSelector((state: RootState) => state.auth.user);

  // If already authenticated, redirect based on user role
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      
      // If explicit redirect URL provided, use it
      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }
      
      // Otherwise redirect based on user role
      if (user.is_superuser || user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'washer') {
        router.push('/staff/washer');
      } else if (user.role === 'folder') {
        router.push('/staff/folder');
      } else if (user.role === 'rider') {
        router.push('/rider');
      } else if (user.is_staff || user.role === 'staff') {
        // Generic staff member
        router.push('/staff');
      } else {
        // Default redirect for regular users/customers
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // If authenticated, show nothing (redirect is happening)
  if (isAuthenticated) {
    return null;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    
    const result = await handleLogin(
      LOGIN_ENDPOINTS.USER,
      { phoneNumber, password },
      dispatch
    );

    if (result.success) {
      // The Redux state will be updated by handleLogin, and the useEffect above
      // will handle the redirect based on user role
    } else {
      setError(result.error || "Login failed");
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold">Sign in</h1>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow space-y-4">
          <div>
            <label className="text-xs text-slate-500">Phone Number</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              placeholder="0712345678"
              autoComplete="tel"
              type="tel"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Password</label>
            <div className="mt-1 relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full rounded-md border dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                placeholder="password"
                autoComplete="current-password"
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
            <Link 
              href="/reset-password" 
              className="text-xs text-red-600 hover:text-red-500 mt-2 inline-block"
            >
              Forgot password?
            </Link>
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center">
                  <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoneNumber("");
                setPassword("");
                setError(null);
              }}
              className="rounded-md border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm"
            >
              Clear
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-300 text-center">
          Sign in to your account or{" "}
          <a href="/signup" className="text-red-600 hover:text-red-500">
            create a new account
          </a>
          .
        </p>
      </div>
    </div>
  );
}
