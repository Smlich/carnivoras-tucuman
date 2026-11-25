import { store } from '../config/store';

export default function HeroSection() {
  return (
    <section className="hero-stage" id="inicio" aria-labelledby="hero-title">
      <img className="botanical-ornament botanical-ornament--hero" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
      <img className="botanical-bloom botanical-bloom--hero" src="/images/botanical/drosera-bloom.svg" alt="" aria-hidden="true" />
      <div className="hero page-shell">
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
            <img
              className="hero__photo"
              src="/images/gallery/optimized/jarro-con-gotas-480w.jpg"
              srcSet="/images/gallery/optimized/jarro-con-gotas-480w.jpg 480w, /images/gallery/jarro-con-gotas.jpeg 960w"
              sizes="(max-width: 860px) 90vw, 42vw"
              alt="Trampa de jarro con gotas de agua, fotografiada en el vivero."
              width="960"
              height="1280"
              fetchPriority="high"
              decoding="async"
            />
            <div className="hero__photo-caption">
              <span className="hero__caption-dot" aria-hidden="true" />
              <span><strong>Una mirada al vivero</strong><small>Fotografía original de Carnívoras Tucumán</small></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
