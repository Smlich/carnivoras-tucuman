import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import AnnouncementBar from './components/AnnouncementBar';
import PreviewBanner from './components/PreviewBanner';
import CareSection from './components/CareSection';
import CartDrawer from './components/CartDrawer';
import ContactSection from './components/ContactSection';
import GallerySection from './components/GallerySection';
import GamesSection from './components/GamesSection';
import HeroSection from './components/HeroSection';
import ProductCatalog from './components/ProductCatalog';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { useCart } from './hooks/use-cart';
import { useCatalog } from './hooks/use-catalog';

function Storefront() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announcementTimerRef = useRef(null);
  const catalog = useCatalog();
  const cart = useCart(catalog.products);

  useEffect(() => () => window.clearTimeout(announcementTimerRef.current), []);

  function closeCart() {
    setIsCartOpen(false);
  }

  function handleAdd(product) {
    cart.addItem(product);
    setAnnouncement(product.name + ' se agregó a tu pedido.');
    window.clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = window.setTimeout(() => setAnnouncement(''), 2600);
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AnnouncementBar />
      <PreviewBanner />
      <SiteHeader itemCount={cart.count} onOpenCart={() => setIsCartOpen(true)} />
      <main id="contenido" tabIndex={-1}>
        <HeroSection />
        <ProductCatalog products={catalog.products} onAdd={handleAdd} />
        <GallerySection />
        <CareSection />
        <GamesSection />
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

export default function App() {
  return (
    <AuthProvider>
      <Storefront />
    </AuthProvider>
  );
}
