import GamesSection from '../components/GamesSection';
import PageBanner from '../components/PageBanner';
import StoreLayout from '../components/StoreLayout';

export default function JuegosPage() {
  return (
    <StoreLayout currentPage="juegos">
      <>
        <PageBanner
          currentLabel="Juegos"
          eyebrow="Beneficio para clientes"
          title={<>Juegos gratis con tu cuenta de <em>Google.</em></>}
          lead="Entrá con tu cuenta de Google para jugar gratis en línea a Dionaea Strike y seguir novedades interactivas del vivero."
        />
        <GamesSection showHeading={false} />
      </>
    </StoreLayout>
  );
}
