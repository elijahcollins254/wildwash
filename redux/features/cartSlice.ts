
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/redux/store';
import { calculateDeliveryMultiplier } from '@/lib/pricing';

// Define a type for the service item
export interface Service {
  id: number;
  name: string;
  price: string;
  description: string;
  category?: string;
  quantity?: number; // Add quantity field
  processing_time?: number; // Processing time in hours
  base_price?: string;
}

// Define the state shape
interface CartState {
  items: Service[];
  deliveryHours: number;
}

const initialState: CartState = {
  items: [],
  deliveryHours: 72,
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Service>) => {
      // Avoid adding duplicates, or increment quantity if already exists
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (!existingItem) {
        const newItem = {
          ...action.payload,
          base_price: action.payload.base_price ?? action.payload.price,
          quantity: action.payload.quantity || 1,
        };
        state.items.push(newItem);
      } else {
        // If item already exists, increment its quantity
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => { // action.payload is the service id
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.deliveryHours = 72;
    },
    restoreCart: (state, action: PayloadAction<Partial<CartState>>) => {
      state.items = Array.isArray(action.payload.items)
        ? action.payload.items.map((item) => ({
            ...item,
            base_price: item.base_price ?? item.price,
            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          }))
        : [];
      state.deliveryHours = Math.min(72, Math.max(6, Math.round(Number(action.payload.deliveryHours) || 72)));
    },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
      }
    },
    setDeliveryHours: (state, action: PayloadAction<number>) => {
      state.deliveryHours = Math.min(72, Math.max(6, Math.round(action.payload)));
    },
  },
});

// Export actions
export const { addToCart, removeFromCart, clearCart, restoreCart, updateQuantity, setDeliveryHours } = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartTotalItems = (state: RootState) => state.cart.items.reduce((total, item) => total + (item.quantity || 1), 0);
export const selectDeliveryHours = (state: RootState) => state.cart.deliveryHours;
export const selectCartBaseTotal = (state: RootState) => state.cart.items.reduce(
  (total, item) => total + Number(item.base_price ?? item.price) * (item.quantity || 1),
  0,
);
export const selectCartTotal = (state: RootState) => selectCartBaseTotal(state) * calculateDeliveryMultiplier(state.cart.deliveryHours);

export default cartSlice.reducer;
