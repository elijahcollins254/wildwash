'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/redux/features/authSlice';
import type { RootState } from '@/redux/store';
import { selectCartTotalItems } from '@/redux/features/cartSlice';
import { useRiderOrderNotifications } from '@/lib/hooks/useRiderOrderNotifications';
import { FiShoppingCart, FiFileText, FiUser, FiGrid, FiLogOut } from 'react-icons/fi';
import { FaShieldAlt, FaCloud, FaFolder, FaPlus, FaSmile, FaTruck, FaMoneyBillWave } from 'react-icons/fa';

export default function NavBar() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const staffType = useSelector((state: RootState) => state.auth.user?.staff_type);
  const userName = useSelector((state: RootState) => state.auth.user?.username);
  const totalCartItems = useSelector(selectCartTotalItems);
  const { availableOrdersCount } = useRiderOrderNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLButtonElement>(null);
  const appsDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isRider = userRole === 'rider';
  const isWasher = userRole === 'staff' && staffType === 'washer';
  const isFolder = userRole === 'staff' && staffType === 'folder';
  const isFumigator = userRole === 'staff' && staffType === 'fumigator';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    dispatch(logout());
    setProfileOpen(false);
    router.push('/');
  };

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      
      // Check if click is outside both apps button AND apps dropdown
      const target = event.target as Node;
      const clickedAppsButton = appsRef.current?.contains(target);
      const clickedAppsDropdown = appsDropdownRef.current?.contains(target);
      
      if (!clickedAppsButton && !clickedAppsDropdown) {
        setAppsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // Check if the click was not on the hamburger menu button
        const target = event.target as HTMLElement;
        if (!target.closest('button[aria-expanded]')) {
          setMobileOpen(false);
        }
      }
    }
    
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const handleAppsClick = () => {
    setAppsOpen(prev => !prev);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-200 ${
        scrolled
          ? 'backdrop-blur-md bg-white/80 dark:bg-[#071025]/90 shadow-sm border-b border-white/10'
          : 'bg-white/60 dark:bg-[#071025]/60 backdrop-blur-sm border-b border-white/5'
      }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/95 flex items-center justify-center shadow-md shrink-0">
              <Link
                href="/"
                aria-label="Go to Wild Wash home"
                title="Wild Wash — Home"
                className="w-12 h-12 rounded-2xl bg-red-500/95 flex items-center justify-center shadow-md shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                <span className="font-bold text-white select-none">WW</span>
              </Link>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold leading-none">Wild Wash</h1>
              <p className="text-xs opacity-85 text-slate-700 dark:text-slate-300">
                Smart laundry, cleaning & fumigation
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 justify-center flex-1">
            <Link
              href="/offers"
              className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
              Offers
            </Link>
            <Link
              href="/borrow"
              className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
              Borrow
            </Link>
            <Link
              href="/invest"
              className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
              Invest
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/bnpl"
                  className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
                  BNPL
                </Link>
                <Link
                  href="/tradein"
                  className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
                  Trade-In
                </Link>
              </>
            )}
            {/* <Link
              href="/casino"
              className="text-xs px-2.5 xl:px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 font-medium transition-colors whitespace-nowrap">
              Casino
            </Link> */}
          </nav>

          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <Link
              href="/cart"
              className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
              <FiShoppingCart className="w-6 h-6" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  {totalCartItems}
                </span>
              )}
            </Link>

            {isAuthenticated && (
              <Link
                href="/orders"
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                title="Your orders">
                <FiFileText className="w-6 h-6" />
              </Link>
            )}

            {/* Rider Orders Notification Dot */}
            {isRider && isAuthenticated && (
              <Link
                href="/rider"
                className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                title="Available orders">
                <FaTruck className="w-6 h-6" />
                {availableOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white animate-pulse">
                    {availableOrdersCount > 99 ? '99+' : availableOrdersCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                  <FiUser className="w-6 h-6" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 z-[100]">
                    <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userName || 'User'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{userRole || 'customer'}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => setProfileOpen(false)}>
                        Your Profile
                      </Link>
                      {!isAuthenticated && (
                        <Link
                          href="/orders"
                          className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={() => setProfileOpen(false)}>
                          Your Orders
                        </Link>
                      )}
                      {userRole === 'admin' && (
                        <>
                          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}>
                            <FaShieldAlt className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                        </>
                      )}
                      {isWasher && (
                        <>
                          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                          <Link
                            href="/staff/washer"
                            className="block px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}>
                            <FaCloud className="w-4 h-4" />
                            Washer Dashboard
                          </Link>
                        </>
                      )}
                      {isFolder && (
                        <>
                          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                          <Link
                            href="/staff/folder"
                            className="block px-4 py-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}>
                            <FaPlus className="w-4 h-4" />
                            Folder Dashboard
                          </Link>
                        </>
                      )}
                      {isFumigator && (
                        <>
                          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                          <Link
                            href="/staff/fumigator"
                            className="block px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}>
                            <FaSmile className="w-4 h-4" />
                            Fumigator Dashboard
                          </Link>
                        </>
                      )}
                      {userRole === 'rider' && (
                        <>
                          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                          <Link
                            href="/rider"
                            className="block px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                            onClick={() => setProfileOpen(false)}>
                            <FaTruck className="w-4 h-4" />
                            Rider Dashboard
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="hidden md:flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <FiLogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile Apps Button - Right side only on mobile */}
          <button
            onClick={handleAppsClick}
            aria-expanded={appsOpen}
            aria-label={appsOpen ? 'Close apps' : 'Open apps'}
            className="relative md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            ref={appsRef}
            title="Apps">
            <FiGrid className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* App Grid Dropdown */}
      {appsOpen && (
        <div 
          ref={appsDropdownRef}
          className="fixed top-16 left-4 z-40 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 w-96 border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-3">
            {/* Offers */}
            <Link
              href="/offers"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 transition-colors group"
              onClick={() => setAppsOpen(false)}>
              <FaMoneyBillWave className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-center">Offers</span>
            </Link>

            {/* Financing */}
            <Link
              href="/financing"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/50 dark:hover:to-green-800/50 transition-colors group"
              onClick={() => setAppsOpen(false)}>
              <FaMoneyBillWave className="w-8 h-8 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-center">Financing</span>
            </Link>

            {/* Borrow */}
            <Link
              href="/borrow"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/50 dark:hover:to-purple-800/50 transition-colors group"
              onClick={() => setAppsOpen(false)}>
              <FaFolder className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-center">Borrow</span>
            </Link>

            {/* Invest */}
            <Link
              href="/invest"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/50 dark:hover:to-orange-800/50 transition-colors group"
              onClick={() => setAppsOpen(false)}>
              <FaMoneyBillWave className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-center">Invest</span>
            </Link>

            {/* BNPL - only for authenticated users */}
            {isAuthenticated && (
              <Link
                href="/bnpl"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 hover:from-pink-100 hover:to-pink-200 dark:hover:from-pink-900/50 dark:hover:to-pink-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaMoneyBillWave className="w-8 h-8 text-pink-600 dark:text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">BNPL</span>
              </Link>
            )}

            {/* Trade-In - only for authenticated users */}
            {isAuthenticated && (
              <Link
                href="/tradein"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 hover:from-cyan-100 hover:to-cyan-200 dark:hover:from-cyan-900/50 dark:hover:to-cyan-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaTruck className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">Trade-In</span>
              </Link>
            )}

            {/* Casino */}
            <Link
              href="/casino"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900/50 dark:hover:to-amber-800/50 transition-colors group"
              onClick={() => setAppsOpen(false)}>
              <FaSmile className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-center">Casino</span>
            </Link>

            {/* Admin Dashboard - only for admin users */}
            {userRole === 'admin' && (
              <Link
                href="/admin"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 hover:from-yellow-100 hover:to-yellow-200 dark:hover:from-yellow-900/50 dark:hover:to-yellow-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaShieldAlt className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">Admin</span>
              </Link>
            )}

            {/* Washer Dashboard - only for washer users */}
            {isWasher && (
              <Link
                href="/staff/washer"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaCloud className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">Washer</span>
              </Link>
            )}

            {/* Folder Dashboard - only for folder users */}
            {isFolder && (
              <Link
                href="/staff/folder"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/50 dark:hover:to-purple-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaPlus className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">Folder</span>
              </Link>
            )}

            {/* Fumigator Dashboard - only for fumigator users */}
            {isFumigator && (
              <Link
                href="/staff/fumigator"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900/50 dark:hover:to-amber-800/50 transition-colors group"
                onClick={() => setAppsOpen(false)}>
                <FaSmile className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">Fumigator</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Button moved to layout.tsx */}
    </header>
  );
}