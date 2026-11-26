import { store } from '../config/store';
import { formatPrice } from './format-price';

export function createOrderMessage(items, storeSettings = store, customerName = '') {
  const businessName = storeSettings?.storeName || storeSettings?.name || store.name;
  const lines = items.map((item) => {
    const lineTotal = item.price * item.quantity;
    return '• ' + item.name + ' × ' + item.quantity + ' — ' + formatPrice(lineTotal);
  });
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const greeting = customerName
    ? `Hola, soy ${customerName} y quiero consultar este pedido en ${businessName}:`
    : `Hola, quiero consultar este pedido en ${businessName}:`;

  return [
    greeting,
    '',
    ...lines,
    '',
    'Total de referencia: ' + formatPrice(total),
    '¿Podrían confirmar disponibilidad, precio vigente y entrega? Gracias.',
  ].join('\n');
}

export function createWhatsAppUrl(items, storeSettings = store, customerName = '') {
  const whatsappNumber = storeSettings?.whatsappNumber || store.whatsappNumber;
  const message = encodeURIComponent(createOrderMessage(items, storeSettings, customerName));
  return 'https://wa.me/' + whatsappNumber + '?text=' + message;
}

export function createContactUrl(customMessage = 'Hola, quisiera consultar por sus plantas carnívoras.', storeSettings = store) {
  const whatsappNumber = storeSettings?.whatsappNumber || store.whatsappNumber;
  const message = encodeURIComponent(customMessage);
  return 'https://wa.me/' + whatsappNumber + '?text=' + message;
}
