import { useEffect, useMemo, useState } from 'react';
import { products } from '../data/products';

const storageKey = 'carnivoras-tucuman-cart-v1';

function readSavedQuantities() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function useCart() {
  const [quantities, setQuantities] = useState(readSavedQuantities);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(quantities));
    } catch {
      // El carrito sigue funcionando durante esta sesión si el almacenamiento está bloqueado.
    }
  }, [quantities]);

  const items = useMemo(
    () => Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .flatMap(([id, quantity]) => {
        const product = products.find((item) => item.id === id);
        return product ? [{ ...product, quantity }] : [];
      }),
    [quantities],
  );

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function addItem(id) {
    setQuantities((current) => ({
      ...current,
      [id]: (current[id] || 0) + 1,
    }));
  }

  function setItemQuantity(id, quantity) {
    setQuantities((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }

      return { ...current, [id]: quantity };
    });
  }

  function clearCart() {
    setQuantities({});
  }

  return { items, count, addItem, setItemQuantity, clearCart };
}
