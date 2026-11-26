import { store } from '../config/store.js';

const argentinePeso = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: store.currency,
  maximumFractionDigits: 0,
});

export function formatPrice(amount) {
  return argentinePeso.format(amount);
}
