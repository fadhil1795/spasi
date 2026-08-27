'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface CartAddOn {
  assetId: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface CartItem {
  id: string; // unique item id
  userId?: string;
  userEmail?: string;
  itemType?: 'ROOM' | 'ASSET';
  assetId?: string;
  roomId?: string;
  roomName?: string;
  roomCode?: string;
  building?: string;
  photoUrl?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  rentalType: 'HOURLY' | 'DAILY';
  durationHours: number;
  priceRate: number;
  roomSubtotal: number;
  depositAmount: number;
  addOns: CartAddOn[];
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItemCount: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const storageKey = session?.user?.email 
    ? `spasi_booking_cart_${session.user.email}` 
    : 'spasi_booking_cart_guest';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCartItems(JSON.parse(saved));
      } else {
        setCartItems([]);
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
  }, [storageKey]);

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  };

  const addToCart = (item: CartItem): boolean => {
    // Session check enforcement
    if (!session || !session.user) {
      return false;
    }

    const itemWithUser: CartItem = {
      ...item,
      userId: (session.user as any).id || undefined,
      userEmail: session.user.email || undefined,
    };

    const existingIndex = cartItems.findIndex((ci) => {
      if (item.itemType === 'ASSET') {
        return ci.itemType === 'ASSET' && ci.assetId === item.assetId && ci.bookingDate === item.bookingDate && ci.startTime === item.startTime;
      }
      return ci.itemType !== 'ASSET' && ci.roomId === item.roomId && ci.bookingDate === item.bookingDate && ci.startTime === item.startTime;
    });
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex] = itemWithUser;
      saveCart(updated);
    } else {
      saveCart([...cartItems, itemWithUser]);
    }
    return true;
  };

  const removeFromCart = (id: string) => {
    saveCart(cartItems.filter((ci) => ci.id !== id));
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalItemCount = cartItems.length;

  const grandTotal = cartItems.reduce((sum, item) => {
    const addonsTotal = item.addOns.reduce((aSum, a) => aSum + a.rate * a.quantity, 0);
    return sum + item.roomSubtotal + addonsTotal + item.depositAmount;
  }, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, totalItemCount, grandTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
