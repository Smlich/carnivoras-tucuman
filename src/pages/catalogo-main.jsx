import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import PageBanner from '../components/PageBanner';
import ProductCatalog from '../components/ProductCatalog';
import StoreLayout from '../components/StoreLayout';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreLayout currentPage="catalogo">
      {({ products, onAdd }) => (
        <>
          <PageBanner
            currentLabel="Catálogo"
            eyebrow="Catálogo completo"
            title={<>Pequeñas maravillas, <em>grandes personalidades.</em></>}
            lead="Filtrá por especie o variedad, ampliá cada foto en máxima calidad y armá tu consulta con precios congelados desde agosto de 2024."
          />
          <ProductCatalog products={products} onAdd={onAdd} showHeading={false} />
        </>
      )}
    </StoreLayout>
  </StrictMode>,
);
