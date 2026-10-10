// redux/provider.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { restoreCart } from './features/cartSlice';

const CART_STORAGE_KEY = 'wildwash_cart_state';

interface Props {
  children: React.ReactNode;
}

export default function CustomProvider({ children }: Props) {
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        store.dispatch(restoreCart(JSON.parse(savedCart)));
      }
    } catch (error) {
      console.warn('[Cart] Unable to restore saved cart:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setCartHydrated(true);

    const unsubscribe = store.subscribe(() => {
      const { items, deliveryHours } = store.getState().cart;
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, deliveryHours }));
      } catch (error) {
        console.warn('[Cart] Unable to persist cart:', error);
      }
    });

    return unsubscribe;
  }, []);

  return <Provider store={store}>{cartHydrated ? children : null}</Provider>;
}
