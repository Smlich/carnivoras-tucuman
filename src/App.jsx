import ContactSection from './components/ContactSection';
import HeroSection from './components/HeroSection';
import HomeHighlights from './components/HomeHighlights';
import StoreLayout from './components/StoreLayout';

export default function App() {
  return (
    <StoreLayout currentPage="inicio">
      {({ products, onAdd }) => (
        <>
          <HeroSection />
          <HomeHighlights products={products} onAdd={onAdd} />
          <ContactSection />
        </>
      )}
    </StoreLayout>
  );
}
