import { useEffect, useRef, useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { formatFreezeUnit, getPriceFreezeDuration } from '../utils/price-freeze-duration';

const speciesPalette = [
  { name: 'Dionaea', dot: 'venus' },
  { name: 'Drosera', dot: 'drosera' },
  { name: 'Sarracenia', dot: 'sarracenia' },
  { name: 'Nepenthes', dot: 'nepenthes' },
  { name: 'Pinguicula', dot: 'pinguicula' },
];

export default function HeroSection() {
  const { settings } = useSiteContent();
  const [isLatInfoOpen, setIsLatInfoOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const latWrapRef = useRef(null);
  const helpButtonRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isLatInfoOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsLatInfoOpen(false);
        helpButtonRef.current?.focus();
      }
    }

    function handlePointerDown(event) {
      if (latWrapRef.current && !latWrapRef.current.contains(event.target)) {
        setIsLatInfoOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isLatInfoOpen]);

  const freezeDuration = getPriceFreezeDuration(now, settings.priceFreezeStartDate);
  const yearsLabel = formatFreezeUnit(freezeDuration.years, 'año', 'años');
  const monthsLabel = formatFreezeUnit(freezeDuration.months, 'mes', 'meses');
  const daysLabel = formatFreezeUnit(freezeDuration.days, 'día', 'días');
  const freezeSummary = `${freezeDuration.years} ${yearsLabel}, ${freezeDuration.months} ${monthsLabel} y ${freezeDuration.days} ${daysLabel} sin subir precios`;

  return (
    <section className="hero-stage" id="inicio" aria-labelledby="hero-title">
      <img className="botanical-ornament botanical-ornament--hero" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
      <img className="botanical-bloom botanical-bloom--hero" src="/images/botanical/drosera-bloom.svg" alt="" aria-hidden="true" />
      <img className="botanical-specimen botanical-specimen--hero" src="/images/botanical/venus-trap-specimen.svg" alt="" aria-hidden="true" />

      <div className="hero page-shell">
        <div className="hero__copy">
          <div className="hero__eyebrow-wrap" ref={latWrapRef}>
            <p className="eyebrow eyebrow--light">
              <span className="eyebrow__line" /> {settings.heroEyebrow}
            </p>
            <button
              ref={helpButtonRef}
              type="button"
              className="eyebrow__help"
              aria-label={settings.heroLatInfoTitle}
              aria-expanded={isLatInfoOpen}
              aria-controls="lat-info-popover"
              onClick={() => setIsLatInfoOpen((open) => !open)}
            >
              ?
            </button>
            {isLatInfoOpen && (
              <div className="eyebrow-popover" id="lat-info-popover" role="region" aria-label="Información sobre latitud">
                <strong>{settings.heroLatInfoTitle}</strong>
                <p>{settings.heroLatInfoText}</p>
              </div>
            )}
          </div>

          <h1 id="hero-title">
            {settings.heroTitlePrefix}
            <em>{settings.heroTitleEmphasis}</em>
            {settings.heroTitleSuffix}
          </h1>
          <p className="hero__lead">{settings.heroLead}</p>

          {settings.priceFreezeEnabled && (
            <div className="price-freeze" aria-live="polite">
              <div className="price-freeze__header">
                <span className="price-freeze__tag">{settings.priceFreezeTag}</span>
                <span className="price-freeze__since">{settings.priceFreezeLabel}</span>
              </div>
              <div className="price-freeze__counters" role="group" aria-label={freezeSummary}>
                <div className="price-freeze__unit">
                  <strong data-freeze-years>{String(freezeDuration.years).padStart(2, '0')}</strong>
                  <span>{yearsLabel}</span>
                </div>
                <div className="price-freeze__unit">
                  <strong data-freeze-months>{String(freezeDuration.months).padStart(2, '0')}</strong>
                  <span>{monthsLabel}</span>
                </div>
                <div className="price-freeze__unit">
                  <strong data-freeze-days>{String(freezeDuration.days).padStart(2, '0')}</strong>
                  <span>{daysLabel}</span>
                </div>
              </div>
            </div>
          )}

          <ul className="hero__species-pills" aria-label="Géneros cultivados en el vivero">
            {speciesPalette.map((species) => (
              <li className="species-pill" key={species.name}>
                <span className={'species-pill__dot species-pill__dot--' + species.dot} aria-hidden="true" />
                {species.name}
              </li>
            ))}
          </ul>

          <div className="hero__actions">
            <a className="button button--dark" href="/catalogo.html">
              {settings.heroPrimaryCtaLabel} <span aria-hidden="true">↗</span>
            </a>
            <a className="button button--outline-light" href="/cuidados.html">
              {settings.heroSecondaryCtaLabel} <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero__proof">
            <div className="hero__proof-mark" aria-hidden="true">{settings.heroProofTag}</div>
            <p>
              <strong>{settings.heroProofTitle}</strong>
              <span>{settings.heroProofSubtitle}</span>
            </p>
          </div>
        </div>

        <div className="hero__visual">
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
                <small>Fotografía original · cultivo sin filtros artificiales</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
