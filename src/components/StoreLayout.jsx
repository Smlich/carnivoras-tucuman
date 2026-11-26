import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { useCart } from '../hooks/use-cart';
import { useCatalog } from '../hooks/use-catalog';
import AnnouncementBar from './AnnouncementBar';
import CartDrawer from './CartDrawer';
import PreviewBanner from './PreviewBanner';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

function StorefrontShell({ currentPage, children }) {
  const catalog = useCatalog();
  const cart = useCart(catalog.products);
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
      <AnnouncementBar />
      <PreviewBanner />
      <SiteHeader currentPage={currentPage} itemCount={cart.count} onOpenCart={() => setIsCartOpen(true)} />
      <main id="contenido" tabIndex={-1}>
        {typeof children === 'function' ? children({ products: catalog.products, onAdd: handleAdd }) : children}
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
      <StorefrontShell currentPage={currentPage}>{children}</StorefrontShell>
    </AuthProvider>
  );
}
