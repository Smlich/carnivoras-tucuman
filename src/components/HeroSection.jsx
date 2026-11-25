import { store } from '../config/store';
import CatalogImage from './CatalogImage';

export default function HeroSection() {
  return (
    <section className="hero page-shell" id="inicio" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="eyebrow"><span className="eyebrow__line" /> Un vivero tucumano, una colección fascinante</p>
        <h1 id="hero-title">La naturaleza tiene formas <em>extraordinarias.</em></h1>
        <p className="hero__lead">
          Descubrí nuestras plantas carnívoras, cultivadas con dedicación y fotografiadas en nuestro propio vivero.
        </p>
        <div className="hero__actions">
          <a className="button button--dark" href="#catalogo">Explorar catálogo <span aria-hidden="true">↗</span></a>
          <a className="text-link" href="#cuidados">Guía para empezar <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero__proof">
          <div className="hero__proof-mark" aria-hidden="true">CT</div>
          <p><strong>Atención directa desde {store.city}</strong><span>Consultá stock y formas de entrega por WhatsApp.</span></p>
        </div>
      </div>

      <div className="hero__visual">
        <span className="hero__location-tag"><span aria-hidden="true" /> Cultivado en Tucumán</span>
        <div className="hero__photo-frame">
          <CatalogImage
            src="/images/catalog/combo-three-plants.png"
            alt="Fotografía real del combo de tres plantas carnívoras pequeñas de Carnívoras Tucumán."
            pictureClassName="hero__picture"
            sizes="(max-width: 860px) 90vw, 42vw"
            fetchPriority="high"
          />
          <div className="hero__photo-caption">
            <span className="hero__caption-dot" aria-hidden="true" />
            <span><strong>Del vivero a tu casa</strong><small>Fotos reales, plantas reales</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}
