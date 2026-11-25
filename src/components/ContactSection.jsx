import { store } from '../config/store';
import { createContactUrl } from '../utils/whatsapp';

export default function ContactSection() {
  return (
    <section className="contact-section section-pad" id="contacto" aria-labelledby="contact-title">
      <div className="page-shell contact-card">
        <div className="contact-card__ornament" aria-hidden="true">✳</div>
        <div className="contact-card__copy">
          <p className="eyebrow"><span className="eyebrow__line" /> Hablemos de plantas</p>
          <h2 id="contact-title">Tu próxima planta está <em>a un mensaje.</em></h2>
          <p>Te ayudamos a elegir, respondemos dudas de cuidado y coordinamos disponibilidad y entrega en {store.city}.</p>
        </div>
        <div className="contact-card__action">
          <a className="button button--dark" href={createContactUrl()} target="_blank" rel="noreferrer">
            Escribir por WhatsApp <span aria-hidden="true">↗</span>
          </a>
          <span>{store.whatsappDisplay}</span>
        </div>
      </div>
    </section>
  );
}
