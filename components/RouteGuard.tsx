"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

type RouteGuardProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireRider?: boolean;
  requireStaff?: boolean;
};

export default function RouteGuard({ children, requireAdmin = false, requireRider = false, requireStaff = false }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Debug log
    console.log('RouteGuard State:', {
      isAuthenticated,
      isLoading,
      userRole,
      requireAdmin,
      requireRider,
      requireStaff,
      pathname
    });

    // Don't redirect while still loading auth state
    if (isLoading) {
      console.log('Still loading auth state, waiting...');
      return;
    }

    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting...');
      // For admin routes, redirect to admin login
      if (requireAdmin) {
        router.push(`/admin-login?redirect=${pathname}`);
      } else if (requireRider) {
        router.push(`/rider-login?redirect=${pathname}`);
      } else if (requireStaff) {
        router.push(`/login?redirect=${pathname}`);
      } else {
        router.push(`/login?redirect=${pathname}`);
      }
      return;
    }

    // Check if user has the required role
    const staffRoles = ['staff', 'washer', 'folder', 'fumigator', 'rider'];
    const hasRequiredRole = 
      (requireAdmin && userRole === 'admin') || 
      (requireRider && userRole === 'rider') ||
      (requireStaff && staffRoles.includes(userRole || ''));
    console.log('Role check:', { requireAdmin, requireRider, requireStaff, userRole, hasRequiredRole });

    if (requireAdmin || requireRider || requireStaff) {
      if (!hasRequiredRole) {
        console.log('Insufficient permissions, showing error...');
        setShowError(true);
        // Auto-redirect after showing error message
        const timer = setTimeout(() => {
          if (requireRider) {
            router.push('/rider-login');
          } else if (requireAdmin) {
            router.push('/admin-login');
          } else if (requireStaff) {
            router.push('/staff');
          } else {
            router.push('/login');
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, isLoading, userRole, requireAdmin, requireRider, requireStaff, router, pathname]);

  if (isLoading) {
    return null; // Return null while loading to avoid showing login page temporarily
  }

  if (!isAuthenticated) {
    return null;
  }

  if ((requireAdmin && userRole !== 'admin') || (requireRider && userRole !== 'rider') || (requireStaff && !['staff', 'washer', 'folder', 'fumigator', 'rider'].includes(userRole || ''))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018]">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-4">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {requireAdmin 
                ? "Sorry, this page is only accessible to administrators."
                : requireRider 
                ? "Sorry, this page is only accessible to riders."
                : "Sorry, this page is only accessible to staff members."}
              You will be redirected to the home page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}