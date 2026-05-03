'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectCartTotalItems } from '@/redux/features/cartSlice';
import type { RootState } from '@/redux/store';
import { FiHome, FiShoppingCart, FiFileText, FiUser, FiLogIn } from 'react-icons/fi';
import { FaShieldAlt, FaTruck, FaCloud, FaPlus, FaSmile } from 'react-icons/fa';

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
            <FiHome className="w-6 h-6" />
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
              <FiShoppingCart className="w-6 h-6" />
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
            <FaShieldAlt className="w-6 h-6" />
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
            <FaTruck className="w-6 h-6" />
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
            <FaCloud className="w-6 h-6" />
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
            <FaPlus className="w-6 h-6" />
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
            <FaSmile className="w-6 h-6" />
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
            <FiFileText className="w-6 h-6" />
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
              <FiUser className="w-6 h-6" />
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
              <FiLogIn className="w-6 h-6" />
              <span className="text-xs font-medium">Sign In</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
