import { store } from '../config/store';
import { createContactUrl } from '../utils/whatsapp';

const CONTACT_TOPICS = [
  {
    badge: 'STOCK Y ENVÍOS',
    title: 'Consultar disponibilidad y entrega',
    description: 'Confirmamos ejemplares listos hoy y coordinamos entrega en San Miguel de Tucumán.',
    cta: 'Consultar disponibilidad',
    message: 'Hola, quería consultar qué plantas carnívoras tienen disponibles hoy y cómo coordinar entrega en Tucumán.',
  },
  {
    badge: 'ASESORAMIENTO',
    title: 'Confirmar cuidados de tu planta',
    description: 'Mandanos foto, cuánta luz recibe y qué agua usás para guiarte paso a paso sin costo.',
    cta: 'Pedir asesoramiento',
    message: 'Hola, ya tengo una planta carnívora y quería consultar por sus cuidados (luz, riego y sustrato).',
  },
  {
    badge: 'ARREGLOS Y COMBOS',
    title: 'Combos para regalo o principiantes',
    description: 'Te ayudamos a elegir el primer combo según el sol y el espacio que tengas en casa.',
    cta: 'Preguntar por combos',
    message: 'Hola, quiero asesoramiento para elegir un combo inicial de plantas carnívoras.',
  },
];

export default function ContactSection({ showHeading = true, showShortcuts = false }) {
  return (
    <section className="contact-section section-pad" id="contacto" aria-labelledby={showHeading ? 'contact-title' : undefined} aria-label={showHeading ? undefined : 'Contacto directo por WhatsApp e Instagram'}>
      <div className="page-shell contact-card">
        <img className="contact-card__ornament" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
        <div className="contact-card__copy">
          {showHeading && <p className="eyebrow"><span className="eyebrow__line" /> Hablemos de plantas</p>}
          {showHeading ? (
            <h2 id="contact-title">Tu próxima planta está <em>a un mensaje.</em></h2>
          ) : (
            <h2>Tu próxima planta está <em>a un mensaje.</em></h2>
          )}
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

      {showShortcuts && (
        <div className="page-shell contact-shortcuts">
          {CONTACT_TOPICS.map((topic) => (
            <article className="contact-shortcut" key={topic.badge}>
              <span className="contact-shortcut__badge">{topic.badge}</span>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <a className="text-link" href={createContactUrl(topic.message)} target="_blank" rel="noreferrer">
                {topic.cta} <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
