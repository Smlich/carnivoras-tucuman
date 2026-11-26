import { store } from '../config/store';
import { formatPrice } from './format-price';

export function createOrderMessage(items) {
  const lines = items.map((item) => {
    const lineTotal = item.price * item.quantity;
    return '• ' + item.name + ' × ' + item.quantity + ' — ' + formatPrice(lineTotal);
  });
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return [
    'Hola, quiero consultar este pedido en ' + store.name + ':',
    '',
    ...lines,
    '',
    'Total de referencia: ' + formatPrice(total),
    '¿Podrían confirmar disponibilidad, precio vigente y entrega? Gracias.',
  ].join('\n');
}

export function createWhatsAppUrl(items) {
  const message = encodeURIComponent(createOrderMessage(items));
  return 'https://wa.me/' + store.whatsappNumber + '?text=' + message;
}

export function createContactUrl(customMessage = 'Hola, quisiera consultar por sus plantas carnívoras.') {
  const message = encodeURIComponent(customMessage);
  return 'https://wa.me/' + store.whatsappNumber + '?text=' + message;
}
