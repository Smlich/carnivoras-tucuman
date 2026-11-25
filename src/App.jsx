import { useCallback, useState } from 'react';
import AnnouncementBar from './components/AnnouncementBar';
import PreviewBanner from './components/PreviewBanner';
import CareSection from './components/CareSection';
import CartDrawer from './components/CartDrawer';
import ContactSection from './components/ContactSection';
import GallerySection from './components/GallerySection';
import HeroSection from './components/HeroSection';
import ProductCatalog from './components/ProductCatalog';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { useCart } from './hooks/use-cart';

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const cart = useCart();

  const closeCart = useCallback(() => setIsCartOpen(false), []);

  function handleAdd(product) {
    cart.addItem(product);
    setAnnouncement(product.name + ' se agregó a tu pedido.');
    window.setTimeout(() => setAnnouncement(''), 2600);
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AnnouncementBar />
      <PreviewBanner />
      <SiteHeader itemCount={cart.count} onOpenCart={() => setIsCartOpen(true)} />
      <main id="contenido" tabIndex={-1}>
        <HeroSection />
        <ProductCatalog onAdd={handleAdd} />
        <GallerySection />
        <CareSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <div className="live-announcement" role="status" aria-live="polite">{announcement}</div>
      <CartDrawer
        isOpen={isCartOpen}
        items={cart.items}
        onClose={closeCart}
        onQuantityChange={cart.setItemQuantity}
        onClear={cart.clearCart}
      />
    </>
  );
}
