import ContactSection from '../components/ContactSection';
import PageBanner from '../components/PageBanner';
import StoreLayout from '../components/StoreLayout';

export default function ContactoPage() {
  return (
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
  );
}
