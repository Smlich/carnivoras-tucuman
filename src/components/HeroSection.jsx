import { useEffect, useRef, useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { formatFreezeUnit, getPriceFreezeDuration } from '../utils/price-freeze-duration';

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
            {String(settings.heroTitlePrefix || '').trimEnd()} <em>{String(settings.heroTitleEmphasis || '').trim()}</em> {String(settings.heroTitleSuffix || '').trimStart()}
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

          <div className="hero__actions">
            <a className="button button--dark" href="/catalogo.html">
              {settings.heroPrimaryCtaLabel} <span aria-hidden="true">↗</span>
            </a>
            <a className="button button--outline-light" href="/cuidados.html">
              {settings.heroSecondaryCtaLabel} <span aria-hidden="true">→</span>
            </a>
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
          </div>
        </div>
      </div>
    </section>
  );
}
