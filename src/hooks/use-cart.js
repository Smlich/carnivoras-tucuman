import { useCallback, useEffect, useMemo, useState } from 'react';
import { products as defaultProducts } from '../data/products';

// El navegador solo recuerda cuántas unidades hay de cada producto.
// Nombre, precio e imagen se leen siempre del catálogo vigente.
const storageKey = 'carnivoras-tucuman-cart-v3';
const legacyStorageKey = 'carnivoras-tucuman-cart-v2';
const maxQuantity = 99;

function sanitizeQuantity(value) {
  return Number.isInteger(value) && value >= 1 ? Math.min(value, maxQuantity) : null;
}

function readStoredObject(key) {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readSavedQuantities() {
  // La versión anterior guardaba { producto, cantidad }; la nueva solo la cantidad.
  const source = readStoredObject(storageKey) ?? readStoredObject(legacyStorageKey) ?? {};
  const quantities = {};

  for (const [id, entry] of Object.entries(source)) {
    const rawQuantity = entry && typeof entry === 'object' ? entry.quantity : entry;
    const quantity = sanitizeQuantity(rawQuantity);
    if (quantity !== null) quantities[id] = quantity;
  }

  return quantities;
}

export function useCart(catalogProducts = defaultProducts) {
  const [quantities, setQuantities] = useState(readSavedQuantities);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(quantities));
    } catch {
      // El carrito sigue funcionando durante esta sesión si el almacenamiento está bloqueado.
    }
  }, [quantities]);

  const items = useMemo(() => {
    const productsById = new Map(catalogProducts.map((product) => [product.id, product]));

    return Object.entries(quantities)
      .filter(([id]) => productsById.has(id))
      .map(([id, quantity]) => ({ ...productsById.get(id), quantity }));
  }, [catalogProducts, quantities]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = useCallback((product) => {
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.min((current[product.id] || 0) + 1, maxQuantity),
    }));
  }, []);

  const setItemQuantity = useCallback((id, quantity) => {
    setQuantities((current) => {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }

      if (!(id in current)) return current;
      return { ...current, [id]: Math.min(quantity, maxQuantity) };
    });
  }, []);

  const clearCart = useCallback(() => setQuantities({}), []);

  return { items, count, addItem, setItemQuantity, clearCart };
}
