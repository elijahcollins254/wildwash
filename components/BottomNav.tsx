'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectCartTotalItems } from '@/redux/features/cartSlice';
import type { RootState } from '@/redux/store';

export default function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const totalCartItems = useSelector(selectCartTotalItems);

  const isActive = (href: string) => pathname === href;

  // Determine if we should show customer navigation
  const showCustomerNav = isAuthenticated && userRole !== 'admin' && userRole !== 'washer' && userRole !== 'folder' && userRole !== 'fumigator' && userRole !== 'rider';
  
  // Determine navigation items based on role
  const getNavItems = () => {
    if (userRole === 'admin') {
      return ['home', 'admin', 'profile'];
    }
    if (userRole === 'rider') {
      return ['home', 'rider', 'profile'];
    }
    if (userRole === 'washer') {
      return ['home', 'washer', 'profile'];
    }
    if (userRole === 'folder') {
      return ['home', 'folder', 'profile'];
    }
    if (userRole === 'fumigator') {
      return ['home', 'fumigator', 'profile'];
    }
    if (showCustomerNav) {
      return ['home', 'cart', 'orders', 'profile'];
    }
    return ['home', 'profile'];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {/* Home */}
        {navItems.includes('home') && (
          <Link
            href="/"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/') 
                ? 'text-red-600 dark:text-red-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Home">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill={isActive('/') ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>
        )}

        {/* Cart */}
        {navItems.includes('cart') && (
          <Link
            href="/cart"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 relative transition-colors ${
              isActive('/cart') 
                ? 'text-red-600 dark:text-red-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Cart">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill={isActive('/cart') ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.888-6.832a1.875 1.875 0 00-1.642-2.56H6.168M9 21a3 3 0 01-3-3h3.75a3 3 0 013 3M21 21a3 3 0 00-3-3h-3.75a3 3 0 003 3z"
                />
              </svg>
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                  {totalCartItems > 99 ? '99+' : totalCartItems}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Cart</span>
          </Link>
        )}

        {/* Admin Dashboard */}
        {navItems.includes('admin') && (
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/admin') 
                ? 'text-amber-600 dark:text-amber-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Admin Dashboard">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16h4v-5h-4v5zm2-7c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
            </svg>
            <span className="text-xs font-medium">Admin</span>
          </Link>
        )}

        {/* Rider Orders */}
        {navItems.includes('rider') && (
          <Link
            href="/rider"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/rider') 
                ? 'text-green-600 dark:text-green-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Rider Orders">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z"/>
            </svg>
            <span className="text-xs font-medium">Rides</span>
          </Link>
        )}

        {/* Washer Dashboard */}
        {navItems.includes('washer') && (
          <Link
            href="/staff/washer"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/staff/washer') 
                ? 'text-blue-600 dark:text-blue-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Washer Dashboard">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
            <span className="text-xs font-medium">Washer</span>
          </Link>
        )}

        {/* Folder Dashboard */}
        {navItems.includes('folder') && (
          <Link
            href="/staff/folder"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/staff/folder') 
                ? 'text-purple-600 dark:text-purple-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Folder Dashboard">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span className="text-xs font-medium">Folder</span>
          </Link>
        )}

        {/* Fumigator Dashboard */}
        {navItems.includes('fumigator') && (
          <Link
            href="/staff/fumigator"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/staff/fumigator') 
                ? 'text-amber-600 dark:text-amber-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Fumigator Dashboard">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
            <span className="text-xs font-medium">Fumigator</span>
          </Link>
        )}

        {/* Orders */}
        {navItems.includes('orders') && (
          <Link
            href="/orders"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive('/orders') 
                ? 'text-red-600 dark:text-red-500' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Orders">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill={isActive('/orders') ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.148.408-.24.603a23.996 23.996 0 003.183.803a23.997 23.997 0 003.183-.803a23.997 23.997 0 00-.241-.603m-3.72 0a45.422 45.422 0 015.05.5c1.54.213 2.9 1.22 3.405 2.544m-4.604-6.817a23.987 23.987 0 00-5.05-.5c-1.54.213-2.9 1.22-3.405 2.544M6.75 7.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs font-medium">Orders</span>
          </Link>
        )}

        {/* Profile */}
        {navItems.includes('profile') && (
          isAuthenticated ? (
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive('/profile') 
                  ? 'text-red-600 dark:text-red-500' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Profile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill={isActive('/profile') ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-xs font-medium">Profile</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive('/login') 
                  ? 'text-red-600 dark:text-red-500' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Sign In">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill={isActive('/login') ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-xs font-medium">Sign In</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
