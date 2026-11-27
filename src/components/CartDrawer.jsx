import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import { formatPrice } from '../utils/format-price';
import { createWhatsAppUrl } from '../utils/whatsapp';
import CatalogImage from './CatalogImage';

export default function CartDrawer({ isOpen, items, onClose, onQuantityChange, onClear }) {
  const { settings } = useSiteContent();
  const { user, enabled, providers, signInWithProvider } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [nameError, setNameError] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const drawerRef = useRef(null);
  const nameInputRef = useRef(null);
  const hasEditedNameRef = useRef(false);
  const lastSubmissionRef = useRef({ signature: '', at: 0 });
  const emptyStateActionRef = useRef(null);
  const previousItemCount = useRef(items.length);

  const isSignedIn = Boolean(user);
  const authProvider = user?.provider || '';
  const isGoogleRegistered = Boolean(user && authProvider === 'google');
  const userEmail = user?.email || '';
  const googleAvailable = enabled && providers.includes('google');
  const facebookAvailable = enabled && providers.includes('facebook');
  const hasUnavailableItems = items.some((item) => item.stockStatus === 'unavailable');

  useEffect(() => {
    setOrderNotice('');
  }, [items, isOpen]);

  useEffect(() => {
    if (user?.name && !hasEditedNameRef.current) {
      setCustomerName(user.name);
      setNameError('');
    }
  }, [user?.name]);

  useEffect(() => {
    const itemCountChangedToEmpty = previousItemCount.current > 0 && items.length === 0;
    previousItemCount.current = items.length;

    if (isOpen && itemCountChangedToEmpty) {
      emptyStateActionRef.current?.focus();
    }
  }, [isOpen, items.length]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const drawer = drawerRef.current;
    const firstFocusable = drawer?.querySelector('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');

    document.body.style.overflow = 'hidden';
    firstFocusable?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawer) return;

      const focusable = Array.from(drawer.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function logOrderInquiry(trimmedName, trimmedNotes) {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true' || items.length === 0) return;

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        customerName: trimmedName,
        customerEmail: userEmail,
        googleRegistered: isGoogleRegistered,
        authProvider,
        notes: trimmedNotes,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        source: 'whatsapp-cart',
      }),
    }).catch(() => {});
  }

  const trimmedName = customerName.trim();
  const trimmedNotes = customerNotes.trim();
  const whatsappUrl = createWhatsAppUrl(items, settings, {
    name: trimmedName,
    googleRegistered: isGoogleRegistered,
    provider: authProvider,
    email: userEmail,
    notes: trimmedNotes,
  });

  function handleWhatsAppCheckout(event) {
    if (hasUnavailableItems) {
      event.preventDefault();
      setNameError('Quitá del pedido los productos sin stock antes de consultar.');
      return;
    }
    if (trimmedName.length < 2) {
      event.preventDefault();
      setNameError('Ingresá tu nombre para enviar el pedido por WhatsApp.');
      nameInputRef.current?.focus();
      return;
    }
    setNameError('');

    const signature = `${trimmedName}|${trimmedNotes}|${items.map((item) => `${item.id}:${item.quantity}`).join(',')}`;
    const now = Date.now();
    if (lastSubmissionRef.current.signature !== signature || now - lastSubmissionRef.current.at > 15_000) {
      lastSubmissionRef.current = { signature, at: now };
      logOrderInquiry(trimmedName, trimmedNotes);
    }
    setOrderNotice('Consulta registrada. Podés vaciar el pedido cuando termines en WhatsApp.');
  }

  return (
    <div className="cart-layer">
      <button className="cart-layer__scrim" type="button" onClick={onClose} aria-label="Cerrar pedido" tabIndex={-1} />
      <aside ref={drawerRef} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabIndex={-1}>
        <div className="cart-drawer__header">
          <div><p className="eyebrow"><span className="eyebrow__line" /> Tu selección</p><h2 id="cart-title">Mi pedido</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar pedido">×</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty__icon" aria-hidden="true">✳</span>
            <h3>Tu pedido está vacío</h3>
            <p>Explorá el catálogo y agregá las plantas que te interesen.</p>
            <button ref={emptyStateActionRef} className="button button--dark" type="button" onClick={onClose}>Volver al catálogo</button>
          </div>
        ) : (
          <>
            <ul className="cart-items">
              {items.map((item) => (
                <li className="cart-item" key={item.id}>
                  <CatalogImage
                    src={item.image}
                    alt=""
                    className="cart-item__image"
                    pictureClassName="cart-item__picture"
                    sizes="80px"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="cart-item__info">
                    <strong>{item.name}</strong>
                    <span>{formatPrice(item.price)} cada uno</span>
                    {item.stockStatus === 'unavailable' && (
                      <small className="cart-item__unavailable">Sin stock momentáneo · quitalo para continuar</small>
                    )}
                    <div className="quantity-control" role="group" aria-label={'Cantidad de ' + item.name}>
                      <button type="button" onClick={() => onQuantityChange(item.id, item.quantity - 1)} aria-label={'Quitar una unidad de ' + item.name}>−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" onClick={() => onQuantityChange(item.id, item.quantity + 1)} aria-label={'Agregar una unidad de ' + item.name}>+</button>
                    </div>
                  </div>
                  <strong className="cart-item__subtotal">{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              <div className={'cart-google-status' + (isSignedIn ? ' is-registered' : '')}>
                <div>
                  <span>Estado de cuenta</span>
                  <strong>
                    {authProvider === 'facebook'
                      ? 'Registrado con Facebook'
                      : authProvider === 'email'
                        ? 'Cuenta con correo'
                        : isSignedIn
                          ? 'Registrado con Google'
                          : 'Sin cuenta iniciada'}
                  </strong>
                  <small>
                    {isSignedIn
                      ? (userEmail || 'Cuenta activa para tu pedido')
                      : 'Se informará automáticamente en tu mensaje de WhatsApp.'}
                  </small>
                </div>
                {!isSignedIn && (googleAvailable || facebookAvailable) && (
                  <button
                    type="button"
                    className="cart-google-status__btn"
                    onClick={() => signInWithProvider(googleAvailable ? 'google' : 'facebook', `${window.location.pathname || '/'}${window.location.search || ''}`).catch(() => {})}
                  >
                    {googleAvailable ? 'Ingresar con Google' : 'Ingresar con Facebook'}
                  </button>
                )}
              </div>
              <label className="cart-customer-field">
                <span>Tu nombre y apellido *</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  maxLength={80}
                  required
                  aria-invalid={nameError ? 'true' : undefined}
                  value={customerName}
                  onChange={(event) => {
                    hasEditedNameRef.current = true;
                    setCustomerName(event.target.value);
                    if (nameError && event.target.value.trim().length >= 2) setNameError('');
                  }}
                  placeholder="Ej. María González o Facundo"
                />
                {nameError && <small className="cart-field-error" role="alert">{nameError}</small>}
              </label>
              <label className="cart-customer-field">
                <span>Nota o zona de entrega (opcional)</span>
                <input
                  type="text"
                  maxLength={300}
                  value={customerNotes}
                  onChange={(event) => setCustomerNotes(event.target.value)}
                  placeholder="Ej. Barrio Norte, prefiero entrega por la tarde"
                />
              </label>
              <div><span>Total de referencia</span><strong>{formatPrice(total)}</strong></div>
              <p>Se envía a WhatsApp tu nombre, el estado de tu cuenta Google y el detalle para confirmar stock y entrega.</p>
              <a
                className="button button--dark button--full"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppCheckout}
              >
                Enviar consulta por WhatsApp <span aria-hidden="true">↗</span>
              </a>
              {orderNotice && <p className="cart-order-notice" role="status">{orderNotice}</p>}
              <button
                className="clear-cart"
                type="button"
                onClick={() => {
                  setCustomerNotes('');
                  onClear();
                }}
              >
                Vaciar pedido
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
