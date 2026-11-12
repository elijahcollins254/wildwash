"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

type Step = "phone" | "code" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1: Phone number
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2: Code
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // Step 3: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Validators
  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!value) return "Phone number is required";
    if (cleaned.length < 10) return "Phone number must be at least 10 digits";
    if (!/^(?:254|0)(?:7|1)\d{8}$/.test(cleaned)) return "Please enter a valid Kenya phone number";
    return "";
  };

  const validateCode = (value: string) => {
    if (!value) return "Code is required";
    if (value.length !== 4) return "Code must be exactly 4 digits";
    if (!/^\d{4}$/.test(value)) return "Code must contain only digits";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(value)) return "Password must contain at least one number";
    return "";
  };

  // Step 1: Send reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    setError(null);

    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Failed to send reset code");
      }

      setSuccess("Reset code sent to your phone");
      setStep("code");
      setSuccess(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    setError(null);

    const error = validateCode(code);
    if (error) {
      setCodeError(error);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/password-reset/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Invalid code");
      }

      setSuccess("Code verified successfully");
      setStep("password");
      setSuccess(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmPasswordError("");
    setError(null);

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setPasswordError(passwordErr);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Failed to reset password");
      }

      setSuccess("Password reset successful");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.message ?? "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {step === "phone" && "Enter your phone number to receive a reset code"}
            {step === "code" && "Enter the 4-digit code sent to your phone"}
            {step === "password" && "Create a new password"}
          </p>
        </header>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`flex-1 h-1 rounded-full ${step === "phone" || step === "code" || step === "password" ? "bg-red-600" : "bg-slate-200 dark:bg-slate-800"}`} />
          <div className={`flex-1 h-1 rounded-full ${step === "code" || step === "password" ? "bg-red-600" : "bg-slate-200 dark:bg-slate-800"}`} />
          <div className={`flex-1 h-1 rounded-full ${step === "password" ? "bg-red-600" : "bg-slate-200 dark:bg-slate-800"}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg text-sm text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === "phone" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError("");
                }}
                placeholder="0712345678 or 0116629591"
                className={`w-full px-4 py-3 rounded-lg border ${
                  phoneError ? "border-red-500" : "border-slate-200 dark:border-slate-800"
                } bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-red-600 transition-ring`}
                autoComplete="tel"
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{phoneError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setCode(val);
                  setCodeError("");
                }}
                placeholder="0000"
                maxLength={4}
                className={`w-full px-4 py-3 text-center text-2xl letter-spacing tracking-widest rounded-lg border ${
                  codeError ? "border-red-500" : "border-slate-200 dark:border-slate-800"
                } bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-red-600 transition-ring`}
              />
              {codeError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{codeError}</p>
              )}
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Enter the 4-digit code sent to {phone}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setCodeError("");
              }}
              className="w-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-lg font-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter new password"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    passwordError ? "border-red-500" : "border-slate-200 dark:border-slate-800"
                  } bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-red-600 transition-ring`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError("");
                  }}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    confirmPasswordError ? "border-red-500" : "border-slate-200 dark:border-slate-800"
                  } bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-red-600 transition-ring`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{confirmPasswordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("code");
                setPassword("");
                setConfirmPassword("");
                setPasswordError("");
                setConfirmPasswordError("");
              }}
              className="w-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-lg font-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Back
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Remember your password?{" "}
            <Link href="/login" className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 font-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
