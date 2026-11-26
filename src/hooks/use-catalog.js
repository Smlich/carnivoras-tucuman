import { useEffect, useState } from 'react';
import { products as localProducts } from '../data/products';
import { fetchProducts } from '../services/products-api';

// Catálogo vigente: parte del catálogo local y lo reemplaza por la API cuando responde.
export function useCatalog() {
  const [products, setProducts] = useState(localProducts);

  useEffect(() => {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true') return undefined;

    const controller = new AbortController();

    fetchProducts({ signal: controller.signal })
      .then(setProducts)
      .catch((error) => {
        if (error.name !== 'AbortError') setProducts(localProducts);
      });

    return () => controller.abort();
  }, []);

  return { products };
}
