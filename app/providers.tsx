'use client';

import { SessionProvider } from 'next-auth/react';
import CustomProvider from '@/redux/provider';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CustomProvider>
        {children}
      </CustomProvider>
    </SessionProvider>
  );
}
