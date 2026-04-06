"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { phonePasswordLogin, googleLogin } from "@/lib/api/unifiedAuthHelpers";
import { Spinner } from "@/components";
import type { RootState } from "@/redux/store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

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
    console.log('[LoginPage] Auth check:', {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
    });
    
    if (!isLoading && isAuthenticated && user) {
      console.log('[LoginPage] User already authenticated, determining redirect...');
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      
      // If explicit redirect URL provided, use it
      if (redirectUrl) {
        console.log('[LoginPage] Redirect URL found:', redirectUrl);
        router.push(redirectUrl);
        return;
      }
      
      // Otherwise redirect based on user role
      const role = user.role;
      console.log('[LoginPage] Redirecting based on role:', role);
      
      if (user.is_superuser || role === 'admin') {
        console.log('[LoginPage] Redirecting to /admin');
        router.push('/admin');
      } else if (role === 'washer') {
        console.log('[LoginPage] Redirecting to /staff/washer');
        router.push('/staff/washer');
      } else if (role === 'folder') {
        console.log('[LoginPage] Redirecting to /staff/folder');
        router.push('/staff/folder');
      } else if (role === 'rider') {
        console.log('[LoginPage] Redirecting to /rider');
        router.push('/rider');
      } else if (user.is_staff || role === 'staff') {
        // Generic staff member
        console.log('[LoginPage] Redirecting to /staff');
        router.push('/staff');
      } else {
        // Default redirect for regular users/customers
        console.log('[LoginPage] Redirecting to /');
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
    
    // Use unified auth - much faster than the old handleLogin
    const result = await phonePasswordLogin(
      phoneNumber,
      password,
      dispatch,
      'user'
    );

    if (result.success) {
      // Redirect based on the result
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      }
    } else {
      setError(result.error || "Login failed");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    console.log('[GoogleSignIn] Starting Google sign-in...');
    
    try {
      // Use unified auth for Google too
      const result = await googleLogin(dispatch);
      
      if (!result.success) {
        console.error('[GoogleSignIn] Google login failed:', result.error);
        // Don't show error to user - just log to console
        setLoading(false);
        return;
      }
      
      console.log('[GoogleSignIn] Google login successful, redirecting to:', result.redirectUrl);
      // Loading stays true while redirecting
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('[GoogleSignIn] Unexpected error:', err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold">Sign in</h1>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white/80 dark:bg-white/5 p-6 shadow space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full rounded-lg bg-green-500 hover:bg-green-600 px-4 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md hover:shadow-lg text-white"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
                Signing in with Google...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium">Or sign in with phone</span>
            </div>
          </div>

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
