import { store } from '../config/store.js';
import { formatPrice } from './format-price.js';

function normalizeCustomerInfo(customer) {
  if (typeof customer === 'string') {
    return {
      name: customer.trim(),
      googleRegistered: false,
      email: '',
    };
  }
  return {
    name: String(customer?.name || '').trim(),
    googleRegistered: Boolean(customer?.googleRegistered),
    email: String(customer?.email || '').trim(),
  };
}

export function formatGoogleStatusLabel({ googleRegistered = false, email = '' } = {}) {
  if (!googleRegistered) return 'No registrado (sin cuenta de Google)';
  return email ? `Registrado con Google (${email})` : 'Registrado con Google';
}

export function createOrderMessage(items, storeSettings = store, customer = {}) {
  const businessName = storeSettings?.storeName || storeSettings?.name || store.name;
  const info = normalizeCustomerInfo(customer);
  const lines = items.map((item) => {
    const lineTotal = item.price * item.quantity;
    return '• ' + item.name + ' × ' + item.quantity + ' — ' + formatPrice(lineTotal);
  });
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const greeting = info.name
    ? `Hola, soy ${info.name} y quiero consultar este pedido en ${businessName}:`
    : `Hola, quiero consultar este pedido en ${businessName}:`;

  return [
    greeting,
    '',
    ...lines,
    '',
    'Total de referencia: ' + formatPrice(total),
    '',
    'Datos del cliente:',
    '• Nombre: ' + (info.name || 'No indicado'),
    '• Cuenta de Google: ' + formatGoogleStatusLabel(info),
    '',
    '¿Podrían confirmar disponibilidad, precio vigente y entrega? Gracias.',
  ].join('\n');
}

export function createWhatsAppUrl(items, storeSettings = store, customer = {}) {
  const whatsappNumber = storeSettings?.whatsappNumber || store.whatsappNumber;
  const message = encodeURIComponent(createOrderMessage(items, storeSettings, customer));
  return 'https://wa.me/' + whatsappNumber + '?text=' + message;
}

export function createContactUrl(customMessage = 'Hola, quisiera consultar por sus plantas carnívoras.', storeSettings = store) {
  const whatsappNumber = storeSettings?.whatsappNumber || store.whatsappNumber;
  const message = encodeURIComponent(customMessage);
  return 'https://wa.me/' + whatsappNumber + '?text=' + message;
}
