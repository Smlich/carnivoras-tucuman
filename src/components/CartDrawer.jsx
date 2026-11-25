import { useEffect, useRef } from 'react';
import { formatPrice } from '../utils/format-price';
import { createWhatsAppUrl } from '../utils/whatsapp';
import CatalogImage from './CatalogImage';

export default function CartDrawer({ isOpen, items, onClose, onQuantityChange, onClear }) {
  const drawerRef = useRef(null);
  const emptyStateActionRef = useRef(null);
  const previousItemCount = useRef(items.length);

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
              <div><span>Total de referencia</span><strong>{formatPrice(total)}</strong></div>
              <p>El stock, el precio vigente y la entrega se confirman por WhatsApp.</p>
              <a className="button button--dark button--full" href={createWhatsAppUrl(items)} target="_blank" rel="noreferrer">
                Enviar consulta por WhatsApp <span aria-hidden="true">↗</span>
              </a>
              <button className="clear-cart" type="button" onClick={onClear}>Vaciar pedido</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
