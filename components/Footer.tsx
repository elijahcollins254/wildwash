'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#071025] border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="flex-1 hidden md:flex items-center gap-4">
            <Link href="/rider" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
              Rider
            </Link>
            <Link href="/staff" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
              Staff
            </Link>
            <Link href="/admin" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
              Admin
            </Link>
          </div>
          <div className="flex flex-shrink-0 flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 md:mb-0">
            <span>© {new Date().getFullYear()} Wild Wash. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/about" className="hover:underline">About</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
              <Link href="/terms-of-service" className="hover:underline">Terms of Service</Link>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/delete-account" className="hover:underline">Request data or account deletion</Link>
            </div>
          </div>
          <div className="flex-1 hidden md:block"></div>
        </div>
      </div>
    </footer>
  );
}
