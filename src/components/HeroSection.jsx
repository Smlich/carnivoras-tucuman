import { store } from '../config/store';

const speciesPalette = [
  { name: 'Dionaea', dot: 'venus' },
  { name: 'Drosera', dot: 'drosera' },
  { name: 'Sarracenia', dot: 'sarracenia' },
  { name: 'Nepenthes', dot: 'nepenthes' },
  { name: 'Pinguicula', dot: 'pinguicula' },
];

export default function HeroSection() {
  return (
    <section className="hero-stage" id="inicio" aria-labelledby="hero-title">
      <img className="botanical-ornament botanical-ornament--hero" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
      <img className="botanical-bloom botanical-bloom--hero" src="/images/botanical/drosera-bloom.svg" alt="" aria-hidden="true" />
      <img className="botanical-specimen botanical-specimen--hero" src="/images/botanical/venus-trap-specimen.svg" alt="" aria-hidden="true" />

      <div className="hero page-shell">
        <div className="hero__copy">
          <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> Estación botánica · Tucumán 26.8° S</p>
          <h1 id="hero-title">Plantas carnívoras <em>vivas</em>, salvajes y reales.</h1>
          <p className="hero__lead">
            Cultivamos trampas de colores reales: del rojo carmesí de la Venus y el brillo ámbar de la Drosera al verde lima de las Nepenthes y la flor orquídea de Pinguicula.
          </p>

          <ul className="hero__species-pills" aria-label="Géneros cultivados en el vivero">
            {speciesPalette.map((species) => (
              <li className="species-pill" key={species.name}>
                <span className={'species-pill__dot species-pill__dot--' + species.dot} aria-hidden="true" />
                {species.name}
              </li>
            ))}
          </ul>

          <div className="hero__actions">
            <a className="button button--dark" href="#catalogo">Explorar catálogo <span aria-hidden="true">↗</span></a>
            <a className="button button--outline-light" href="/cuidados.html">Guía ilustrada de cuidados <span aria-hidden="true">→</span></a>
          </div>

          <div className="hero__proof">
            <div className="hero__proof-mark" aria-hidden="true">LAB</div>
            <p>
              <strong>Atención directa desde {store.city}</strong>
              <span>Consultá stock vigente, precios y cuidados por WhatsApp.</span>
            </p>
          </div>
        </div>

        <div className="hero__visual">
          <span className="hero__location-tag"><span aria-hidden="true" /> SPEC-01 · Cultivo vivo</span>
          <div className="hero__photo-frame">
            <img
              className="hero__photo"
              src="/images/gallery/optimized/jarro-con-gotas-480w.jpg"
              srcSet="/images/gallery/optimized/jarro-con-gotas-480w.jpg 480w, /images/gallery/jarro-con-gotas.jpeg 960w"
              sizes="(max-width: 860px) 90vw, 42vw"
              alt="Trampa verde lima de Nepenthes cubierta de gotas de agua en el vivero."
              width="960"
              height="1280"
              fetchPriority="high"
              decoding="async"
            />
            <div className="hero__photo-caption">
              <span className="hero__caption-dot" aria-hidden="true" />
              <span>
                <strong>Nepenthes del vivero</strong>
                <small>Fotografía original · sin filtros artificiales</small>
              </span>
            </div>
          </div>

          <div className="hero__specimen-peek" aria-hidden="true">
            <img src="/images/gallery/optimized/venus-trampa-macro-480w.jpg" alt="" width="52" height="52" />
            <span>
              <strong>Dionaea · Sawtooth</strong>
              <small>Bordes dentados y néctar rojo</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
