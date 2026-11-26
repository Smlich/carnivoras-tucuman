import { useEffect, useRef, useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';

const initialVisibleCount = 8;

function getResponsiveSrcSet(item) {
  const match = /^\/images\/gallery\/([^/]+)\.jpe?g$/i.exec(item.src ?? '');
  if (!match) return undefined;
  return `/images/gallery/optimized/${match[1]}-480w.jpg 480w, ${item.src} ${item.width || 960}w`;
}

function getGenusKey(label) {
  const text = String(label ?? '').toLowerCase();
  if (text.includes('venus')) return 'venus';
  if (text.includes('drosera')) return 'drosera';
  if (text.includes('nepenthes')) return 'nepenthes';
  if (text.includes('sarracenia')) return 'sarracenia';
  if (text.includes('pinguicula')) return 'pinguicula';
  return 'vivero';
}

export default function GallerySection({ defaultExpanded = false, showHeading = true }) {
  const { gallery: galleryItems } = useSiteContent();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeIndex, setActiveIndex] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const activeItem = activeIndex === null ? null : galleryItems[activeIndex] ?? null;
  const visibleItems = isExpanded ? galleryItems : galleryItems.slice(0, initialVisibleCount);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!activeItem) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
  }, [activeItem]);

  function handleViewerKeyDown(event) {
    if (activeIndex === null || galleryItems.length === 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % galleryItems.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + galleryItems.length) % galleryItems.length);
    }
  }

  return (
    <section className="gallery-section section-pad" id="galeria" aria-labelledby={showHeading ? 'gallery-title' : undefined} aria-label={showHeading ? undefined : 'Álbum del vivero'}>
      <div className="page-shell">
        {showHeading && (
          <div className="section-heading gallery-section__heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Álbum del vivero</p>
              <h2 id="gallery-title">De nuestro vivero, <em>sin filtros.</em></h2>
            </div>
            <div className="gallery-section__intro">
              <p>Una colección de fotos reales, tomadas mientras cultivamos y observamos nuestras plantas.</p>
              <a className="text-link" href="/catalogo.html">Ver plantas del catálogo <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        )}

        <div className="gallery-grid" id="gallery-grid">
          {visibleItems.map((item, index) => (
            <figure className="gallery-card" key={item.id || item.src} data-genus={getGenusKey(item.label)}>
              <button
                className="gallery-card__open"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Ampliar foto: ${item.title}`}
                onClick={() => setActiveIndex(index)}
              >
                <img
                  src={item.src}
                  srcSet={getResponsiveSrcSet(item)}
                  sizes="(max-width: 460px) 46vw, (max-width: 760px) 46vw, (max-width: 1000px) 30vw, 23vw"
                  alt={item.alt}
                  width={item.width || 960}
                  height={item.height || 1280}
                  loading="lazy"
                  decoding="async"
                />
                <span className="gallery-card__zoom" aria-hidden="true">↗</span>
              </button>
              <figcaption className="gallery-card__caption">
                <span>{item.label}</span>
                <strong>{item.title}</strong>
              </figcaption>
            </figure>
          ))}
        </div>

        {galleryItems.length > initialVisibleCount && (
          <button
            className="gallery-section__toggle"
            type="button"
            aria-expanded={isExpanded}
            aria-controls="gallery-grid"
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            {isExpanded ? 'Mostrar una selección' : `Ver el álbum completo · ${galleryItems.length} fotos`}
            <span aria-hidden="true">{isExpanded ? '↑' : '↓'}</span>
          </button>
        )}
        <p className="gallery-section__note">Las fotos muestran ejemplares de nuestro vivero; la disponibilidad puede cambiar. Consultá el catálogo antes de armar tu pedido.</p>
      </div>

      <dialog
        className="gallery-viewer"
        ref={dialogRef}
        aria-labelledby="gallery-viewer-title"
        onClose={() => setActiveIndex(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActiveIndex(null);
        }}
        onKeyDown={handleViewerKeyDown}
      >
        {activeItem && (
          <div className="gallery-viewer__content">
            <button
              className="gallery-viewer__close"
              type="button"
              aria-label="Cerrar foto ampliada"
              ref={closeButtonRef}
              onClick={() => setActiveIndex(null)}
            >
              <span aria-hidden="true">×</span>
              <span>Cerrar</span>
            </button>
            <div className="gallery-viewer__photo-row">
              <button
                className="gallery-viewer__arrow"
                type="button"
                aria-label="Ver foto anterior"
                onClick={() => setActiveIndex((current) => (current - 1 + galleryItems.length) % galleryItems.length)}
              >
                <span aria-hidden="true">←</span>
              </button>
              <img className="gallery-viewer__image" src={activeItem.src} alt={activeItem.alt} />
              <button
                className="gallery-viewer__arrow"
                type="button"
                aria-label="Ver foto siguiente"
                onClick={() => setActiveIndex((current) => (current + 1) % galleryItems.length)}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="gallery-viewer__caption">
              <span>{activeItem.label} · {activeIndex + 1} de {galleryItems.length}</span>
              <h2 id="gallery-viewer-title">{activeItem.title}</h2>
              <p>{activeItem.description}</p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
