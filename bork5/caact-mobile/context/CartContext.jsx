import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "coldair_cart";
const CartContext = createContext(null);

const normalizeQuantity = (quantity, max = Number.POSITIVE_INFINITY) =>
  Math.max(1, Math.min(Math.floor(Number(quantity) || 1), Math.max(1, Number(max) || 1)));

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((savedCart) => {
        if (!savedCart) return;
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) setCart(parsedCart);
      })
      .catch(() => AsyncStorage.removeItem(CART_STORAGE_KEY))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)).catch(() => {});
  }, [cart, hydrated]);

  const addToCart = (product, quantity = 1) => {
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
  };

  const updateQuantity = (productId, quantity) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, quantity: normalizeQuantity(quantity, item.stock ?? Number.POSITIVE_INFINITY) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => String(item.id) !== String(productId)));
  };

  const clearCart = () => setCart([]);

  const replaceCart = (nextCart = []) => {
    setCart(Array.isArray(nextCart) ? nextCart : []);
  };

  const value = useMemo(() => {
    const cartCount = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const cartTotal = cart.reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
    return { cart, cartCount, cartTotal, hydrated, addToCart, updateQuantity, removeFromCart, clearCart, replaceCart };
  }, [cart, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
