import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'localite_cart_';

export function useCartStorage(shopId) {
  const key = shopId ? `${PREFIX}${shopId}` : null;
  const [cart, setCartState] = useState({});
  const [loaded, setLoaded] = useState(false);

  const save = useCallback((next) => {
    setCartState(next);
    if (key) AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  }, [key]);

  useEffect(() => {
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) setCartState(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [key]);

  const addItem = useCallback((itemId) => {
    setCartState((prev) => {
      const next = { ...prev, [itemId]: (prev[itemId] || 0) + 1 };
      if (key) AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);

  const removeItem = useCallback((itemId) => {
    setCartState((prev) => {
      const next = { ...prev };
      const qty = (next[itemId] || 0) - 1;
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      if (key) AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);

  const clearCart = useCallback(() => {
    save({});
  }, [save]);

  return { cart, loaded, addItem, removeItem, clearCart, setCart: save };
}
