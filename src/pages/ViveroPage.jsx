import GallerySection from '../components/GallerySection';
import PageBanner from '../components/PageBanner';
import StoreLayout from '../components/StoreLayout';

export default function ViveroPage() {
  return (
    <StoreLayout currentPage="vivero">
      <>
        <PageBanner
          currentLabel="Vivero"
          eyebrow="Álbum del vivero"
          title={<>De nuestro vivero, <em>sin filtros.</em></>}
          lead="Fotografías originales tomadas mientras cultivamos y observamos cada ejemplar en Tucumán. Tocá cualquier foto para recorrer la galería."
        />
        <GallerySection defaultExpanded showHeading={false} />
      </>
    </StoreLayout>
  );
}
