'use client';

import { SessionProvider } from 'next-auth/react';
import CustomProvider from '@/redux/provider';
import { OrderProvider } from '@/lib/context/OrderContext';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CustomProvider>
        <OrderProvider>
          {children}
        </OrderProvider>
      </CustomProvider>
    </SessionProvider>
  );
}
