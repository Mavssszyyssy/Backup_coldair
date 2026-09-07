import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUserContext } from "./UserContext";

const CartContext = createContext(null);

const normalizeQuantity = (quantity, max = Number.POSITIVE_INFINITY) =>
  Math.max(1, Math.min(Math.floor(Number(quantity) || 1), Math.max(1, Number(max) || 1)));

export function CartProvider({ children }) {
  const { current, initialized } = useUserContext();
  const [cart, setCart] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const cartStorageKey = current?.role === "customer" && current?.id ? `coldair_cart_v2:${current.id}` : "";
  const hydrated = initialized && loadedKey === cartStorageKey;

  useEffect(() => {
    let active = true;
    if (!initialized) return undefined;

    setLoadedKey(null);
    setCart((previous) => previous.length ? [] : previous);
    if (!cartStorageKey) {
      setLoadedKey("");
      return undefined;
    }

    AsyncStorage.getItem(cartStorageKey)
      .then((savedCart) => {
        if (!active) return;
        if (!savedCart) return;
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) setCart(parsedCart);
      })
      .catch(() => AsyncStorage.removeItem(cartStorageKey))
      .finally(() => {
        if (active) setLoadedKey(cartStorageKey);
      });

    return () => {
      active = false;
    };
  }, [cartStorageKey, initialized]);

  useEffect(() => {
    if (!hydrated || !cartStorageKey) return;
    AsyncStorage.setItem(cartStorageKey, JSON.stringify(cart)).catch(() => {});
  }, [cart, hydrated, cartStorageKey]);

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product?.id) return;
    setCart((currentCart) => {
      const existing = currentCart.find((item) => String(item.id) === String(product.id));
      const max = product.stock ?? Number.POSITIVE_INFINITY;
      if (existing) {
        return currentCart.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, ...product, quantity: normalizeQuantity(item.quantity + quantity, max) }
            : item,
        );
      }
      return [...currentCart, { ...product, quantity: normalizeQuantity(quantity, max) }];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, quantity: normalizeQuantity(quantity, item.stock ?? Number.POSITIVE_INFINITY) }
          : item,
      ),
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((currentCart) => currentCart.filter((item) => String(item.id) !== String(productId)));
  }, []);

  const clearCart = useCallback(() => setCart((previous) => previous.length ? [] : previous), []);

  const replaceCart = useCallback((nextCart = []) => {
    const next = Array.isArray(nextCart) ? nextCart : [];
    setCart((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);

  const value = useMemo(() => {
    const cartCount = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const cartTotal = cart.reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
    return { cart, cartCount, cartTotal, hydrated, addToCart, updateQuantity, removeFromCart, clearCart, replaceCart };
  }, [cart, hydrated, addToCart, updateQuantity, removeFromCart, clearCart, replaceCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
