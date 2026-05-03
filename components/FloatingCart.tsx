'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectCartTotalItems } from '@/redux/features/cartSlice';
import type { RootState } from '@/redux/store';
import { FiShoppingCart } from 'react-icons/fi';

export default function FloatingCart() {
  const totalCartItems = useSelector(selectCartTotalItems);

  return (
    <Link
      href="/cart"
      title="Shopping Cart"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl hover:from-red-700 hover:to-red-800 transition-all hover:scale-110 active:scale-95">
      <FiShoppingCart className="w-6 h-6" />
      {totalCartItems > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 text-xs font-bold">
          {totalCartItems}
        </span>
      )}
    </Link>
  );
}
