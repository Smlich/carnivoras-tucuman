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
          <a className="contact-card__instagram" href={store.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={'Seguir a Carnívoras Tucumán en Instagram ' + store.instagramHandle}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.5" cy="6.7" r="1" fill="currentColor" />
            </svg>
            <span>Seguinos en Instagram <strong>{store.instagramHandle}</strong></span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
