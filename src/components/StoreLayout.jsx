import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SiteContentProvider, useSiteContent } from '../context/SiteContentContext';
import { useCart } from '../hooks/use-cart';
import CartDrawer from './CartDrawer';
import PreviewBanner from './PreviewBanner';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

function StorefrontShell({ currentPage, children }) {
  const { products } = useSiteContent();
  const cart = useCart(products);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announcementTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(announcementTimerRef.current), []);

  function announceAddedProduct(product) {
    setAnnouncement(`${product.name} se agregó al pedido.`);
    window.clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = window.setTimeout(() => setAnnouncement(''), 2600);
  }

  function handleAdd(product) {
    cart.addItem(product);
    announceAddedProduct(product);
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <PreviewBanner />
      <SiteHeader currentPage={currentPage} itemCount={cart.count} onOpenCart={() => setIsCartOpen(true)} />
      <main id="contenido" tabIndex={-1}>
        {typeof children === 'function' ? children({ products, onAdd: handleAdd }) : children}
      </main>
      <SiteFooter />
      <div className="live-announcement" role="status" aria-live="polite" aria-atomic="true">
        {announcement && <p>{announcement}</p>}
      </div>
      <CartDrawer
        isOpen={isCartOpen}
        items={cart.items}
        onClose={() => setIsCartOpen(false)}
        onQuantityChange={cart.setItemQuantity}
        onClear={cart.clearCart}
      />
    </>
  );
}

export default function StoreLayout({ currentPage = 'inicio', children }) {
  return (
    <AuthProvider>
      <SiteContentProvider>
        <StorefrontShell currentPage={currentPage}>{children}</StorefrontShell>
      </SiteContentProvider>
    </AuthProvider>
  );
}
