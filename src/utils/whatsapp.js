import { store } from '../config/store.js';
import { formatPrice } from './format-price.js';

function normalizeCustomerInfo(customer) {
  if (typeof customer === 'string') {
    return {
      name: customer.trim(),
      googleRegistered: false,
      provider: '',
      email: '',
      notes: '',
    };
  }
  const googleRegistered = Boolean(customer?.googleRegistered);
  const rawProvider = String(customer?.provider || customer?.authProvider || '').trim().toLowerCase();
  const provider = rawProvider || (googleRegistered ? 'google' : '');
  return {
    name: String(customer?.name || '').trim(),
    googleRegistered,
    provider,
    email: String(customer?.email || '').trim(),
    notes: String(customer?.notes || '').trim(),
  };
}

export function formatGoogleStatusLabel({ googleRegistered = false, email = '', provider = '' } = {}) {
  const normalizedProvider = String(provider || (googleRegistered ? 'google' : '')).trim().toLowerCase();
  if (normalizedProvider === 'facebook') {
    return email ? `Registrado con Facebook (${email})` : 'Registrado con Facebook';
  }
  if (normalizedProvider === 'email') {
    return email ? `Cuenta con correo (${email})` : 'Cuenta con correo';
  }
  if (googleRegistered || normalizedProvider === 'google') {
    return email ? `Registrado con Google (${email})` : 'Registrado con Google';
  }
  return 'No registrado (sin cuenta de Google)';
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

  const accountPrefix = info.provider === 'facebook' || info.provider === 'email'
    ? '• Cuenta: '
    : '• Cuenta de Google: ';

  const customerLines = [
    'Datos del cliente:',
    '• Nombre: ' + (info.name || 'No indicado'),
    accountPrefix + formatGoogleStatusLabel(info),
    ...(info.notes ? ['• Nota: ' + info.notes] : []),
  ];

  return [
    greeting,
    '',
    ...lines,
    '',
    'Total de referencia: ' + formatPrice(total),
    '',
    ...customerLines,
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
