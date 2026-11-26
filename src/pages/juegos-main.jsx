import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import GamesSection from '../components/GamesSection';
import PageBanner from '../components/PageBanner';
import StoreLayout from '../components/StoreLayout';

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
);
