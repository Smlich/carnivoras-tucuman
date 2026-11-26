const MAX_ITEM_QUANTITY = 99;

/**
 * Resuelve los ítems de un pedido contra el catálogo vigente del servidor
 * para evitar manipulación de precios, nombres o productos sin stock.
 */
export function resolveOrderItems(requestedItems = [], catalogProducts = []) {
  const byId = new Map();
  for (const product of catalogProducts) {
    if (!product || product.isActive === false) continue;
    if (product.id) byId.set(product.id, product);
  }

  const merged = new Map();
  for (const requested of requestedItems) {
    const product = byId.get(requested.id);
    if (!product) {
      return {
        error: {
          status: 400,
          code: 'INVALID_ORDER_ITEM',
          message: `El producto "${requested.id}" no está disponible en el catálogo vigente.`,
        },
      };
    }

    if (product.stockStatus === 'unavailable') {
      return {
        error: {
          status: 409,
          code: 'PRODUCT_UNAVAILABLE',
          message: `"${product.name}" está momentáneamente sin stock.`,
        },
      };
    }

    const existing = merged.get(product.id);
    const nextQty = Math.min((existing?.quantity || 0) + Number(requested.quantity || 1), MAX_ITEM_QUANTITY);
    merged.set(product.id, {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: nextQty,
    });
  }

  const items = Array.from(merged.values());
  const totalARS = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, totalARS };
}
