import { useEffect, useMemo, useState } from 'react';

const storageKey = 'carnivoras-tucuman-cart-v2';

function readSavedItems() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function useCart() {
  const [cartState, setCartState] = useState(readSavedItems);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cartState));
    } catch {
      // El carrito sigue funcionando durante esta sesión si el almacenamiento está bloqueado.
    }
  }, [cartState]);

  const items = useMemo(
    () => Object.values(cartState)
      .filter((item) => item && item.product && Number.isInteger(item.quantity) && item.quantity > 0)
      .map((item) => ({ ...item.product, quantity: item.quantity })),
    [cartState],
  );

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function addItem(product) {
    setCartState((current) => {
      const currentItem = current[product.id];
      return {
        ...current,
        [product.id]: {
          product,
          quantity: (currentItem?.quantity || 0) + 1,
        },
      };
    });
  }

  function setItemQuantity(id, quantity) {
    setCartState((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }

      const currentItem = current[id];
      if (!currentItem) return current;
      return { ...current, [id]: { ...currentItem, quantity } };
    });
  }

  function clearCart() {
    setCartState({});
  }

  return { items, count, addItem, setItemQuantity, clearCart };
}
