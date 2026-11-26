import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOrderMessage,
  createWhatsAppUrl,
  formatGoogleStatusLabel,
} from '../../src/utils/whatsapp.js';

const sampleItems = [
  { id: 'venus-pequena', name: 'Dionaea muscipula · Venus atrapamoscas', price: 18500, quantity: 2 },
];

const sampleSettings = {
  storeName: 'Carnívoras Tucumán',
  whatsappNumber: '5493816168898',
};

test('formatGoogleStatusLabel distingue entre cuenta verificada de Google y cliente invitado', () => {
  assert.equal(
    formatGoogleStatusLabel({ googleRegistered: true, email: 'ana@gmail.com' }),
    'Registrado con Google (ana@gmail.com)',
  );
  assert.equal(
    formatGoogleStatusLabel({ googleRegistered: false }),
    'No registrado (sin cuenta de Google)',
  );
});

test('createOrderMessage incluye nombre y registro Google del cliente para WhatsApp', () => {
  const registeredMessage = createOrderMessage(sampleItems, sampleSettings, {
    name: 'Ana Gómez',
    googleRegistered: true,
    email: 'ana@gmail.com',
  });

  assert.match(registeredMessage, /Hola, soy Ana Gómez y quiero consultar este pedido en Carnívoras Tucumán:/);
  assert.match(registeredMessage, /Datos del cliente:/);
  assert.match(registeredMessage, /• Nombre: Ana Gómez/);
  assert.match(registeredMessage, /• Cuenta de Google: Registrado con Google \(ana@gmail\.com\)/);

  const guestMessage = createOrderMessage(sampleItems, sampleSettings, {
    name: 'Carlos Ruiz',
    googleRegistered: false,
  });

  assert.match(guestMessage, /• Nombre: Carlos Ruiz/);
  assert.match(guestMessage, /• Cuenta de Google: No registrado \(sin cuenta de Google\)/);

  const legacyUrl = createWhatsAppUrl(sampleItems, sampleSettings, 'Lucía');
  const decoded = decodeURIComponent(legacyUrl.split('?text=')[1]);
  assert.match(decoded, /• Nombre: Lucía/);
  assert.match(decoded, /• Cuenta de Google: No registrado \(sin cuenta de Google\)/);
  assert.doesNotMatch(decoded, /• Nota:/);

  const notedMessage = createOrderMessage(sampleItems, sampleSettings, {
    name: 'Lucía',
    googleRegistered: false,
    notes: 'Barrio Norte, después de las 17 h',
  });
  assert.match(notedMessage, /• Nota: Barrio Norte, después de las 17 h/);
});
