import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import ContactSection from '../components/ContactSection';
import PageBanner from '../components/PageBanner';
import StoreLayout from '../components/StoreLayout';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreLayout currentPage="contacto">
      <>
        <PageBanner
          currentLabel="Contacto"
          eyebrow="Atención personalizada"
          title={<>Hablemos directo sobre <em>tu planta.</em></>}
          lead="Coordinamos disponibilidad, entrega en Tucumán y asesoramiento post-compra para que tu carnívora crezca sana desde el primer día."
        />
        <ContactSection showHeading={false} showShortcuts />
      </>
    </StoreLayout>
  </StrictMode>,
);
