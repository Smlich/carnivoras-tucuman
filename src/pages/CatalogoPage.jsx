import CatalogRecommender from '../components/CatalogRecommender';
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
      <CatalogRecommender products={products} onAdd={onAdd} />
      <ProductCatalog products={products} onAdd={onAdd} showHeading={false} />
    </>
  );
}

export default function CatalogoPage() {
  return (
    <StoreLayout currentPage="catalogo">
      {({ products, onAdd }) => <CatalogoPageContent products={products} onAdd={onAdd} />}
    </StoreLayout>
  );
}
