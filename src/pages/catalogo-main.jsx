import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import PageBanner from '../components/PageBanner';
import ProductCatalog from '../components/ProductCatalog';
import StoreLayout from '../components/StoreLayout';
import { useSiteContent } from '../context/SiteContentContext';

function CatalogoPageContent({ products, onAdd }) {
  const { settings } = useSiteContent();
  const lead = settings.priceFreezeEnabled
    ? 'Filtrá por especie o variedad, ampliá cada foto en máxima calidad y armá tu consulta con precios de referencia sin aumentos.'
    : 'Filtrá por especie o variedad, ampliá cada foto en máxima calidad y armá tu consulta directa por WhatsApp.';

  return (
    <>
      <PageBanner
        currentLabel="Catálogo"
        eyebrow="Catálogo completo"
        title={<>Pequeñas maravillas, <em>grandes personalidades.</em></>}
        lead={lead}
      />
      <ProductCatalog products={products} onAdd={onAdd} showHeading={false} />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreLayout currentPage="catalogo">
      {({ products, onAdd }) => <CatalogoPageContent products={products} onAdd={onAdd} />}
    </StoreLayout>
  </StrictMode>,
);
