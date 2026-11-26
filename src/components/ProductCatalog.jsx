import { useEffect, useMemo, useRef, useState } from 'react';
import { store } from '../config/store';
import { normalizeSearchText } from '../utils/normalize-text';
import { formatPrice } from '../utils/format-price';
import ProductCard from './ProductCard';

const filters = [
  { id: 'todos', label: 'Todo el catálogo' },
  { id: 'combos', label: 'Combos y promos' },
  { id: 'venus', label: 'Venus atrapamoscas' },
  { id: 'otras', label: 'Otras especies' },
  { id: 'especiales', label: 'Cultivares' },
];

export default function ProductCatalog({ products: catalogProducts, onAdd }) {
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProductId, setActiveProductId] = useState(null);
  const [addedProductId, setAddedProductId] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    return catalogProducts.filter((product) => {
      const matchesCategory = activeFilter === 'todos' || product.category === activeFilter;
      const searchable = normalizeSearchText(
        [product.name, product.species, product.description, product.categoryLabel, product.note].join(' '),
      );
      return matchesCategory && searchable.includes(normalizedSearch);
    });
  }, [activeFilter, catalogProducts, searchTerm]);

  const activeProduct = activeProductId === null
    ? null
    : catalogProducts.find((product) => product.id === activeProductId) ?? null;
  const viewerProducts = activeProduct && !visibleProducts.some((product) => product.id === activeProduct.id)
    ? [activeProduct]
    : visibleProducts;
  const activeIndex = activeProduct ? viewerProducts.findIndex((product) => product.id === activeProduct.id) : -1;
  const canNavigate = viewerProducts.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!activeProduct) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
  }, [activeProduct]);

  function showProduct(offset) {
    if (!canNavigate) return;
    const nextIndex = (activeIndex + offset + viewerProducts.length) % viewerProducts.length;
    setAddedProductId(null);
    setActiveProductId(viewerProducts[nextIndex].id);
  }

  function handleViewerKeyDown(event) {
    if (!activeProduct) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showProduct(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showProduct(-1);
    }
  }

  function openProduct(product) {
    setAddedProductId(null);
    setActiveProductId(product.id);
  }

  function handleViewerAdd() {
    onAdd(activeProduct);
    setAddedProductId(activeProduct.id);
  }

  const resultAnnouncement = visibleProducts.length === 0
    ? 'No se encontraron plantas.'
    : visibleProducts.length === 1
      ? 'Se encontró 1 planta.'
      : `Se encontraron ${visibleProducts.length} plantas.`;

  return (
    <section className="catalog-section section-pad" id="catalogo" aria-labelledby="catalog-title">
      <div className="page-shell">
        <div className="section-heading section-heading--catalog">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> Nuestro catálogo</p>
            <h2 id="catalog-title">Pequeñas maravillas, <em>grandes personalidades.</em></h2>
          </div>
          <p className="section-heading__aside">Elegí tus favoritas y armá una consulta. Te confirmamos disponibilidad y entrega desde {store.city}.</p>
        </div>

        <div className="catalog-toolbar">
          <div className="filter-list" role="group" aria-label="Filtrar catálogo por tipo">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={'filter-chip' + (activeFilter === filter.id ? ' is-active' : '')}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="search-field__icon" aria-hidden="true">⌕</span>
            <span className="visually-hidden">Buscar en el catálogo</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar una planta"
            />
          </label>
        </div>

        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {resultAnnouncement}
        </p>

        <p className="catalog-note"><span aria-hidden="true">i</span> Valores publicados en pesos argentinos. Consultá vigencia y stock antes de confirmar. Tocá una foto para verla ampliada.</p>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} onInspect={openProduct} />
            ))}
          </div>
        ) : (
          <div className="empty-search">
            <span aria-hidden="true">✳</span>
            <h3>No encontramos esa planta</h3>
            <p>Probá con otra búsqueda o volvé a ver todo el catálogo.</p>
            <button className="text-link" type="button" onClick={() => { setSearchTerm(''); setActiveFilter('todos'); }}>Mostrar todo el catálogo</button>
          </div>
        )}
      </div>

      <dialog
        className="gallery-viewer catalog-viewer"
        ref={dialogRef}
        aria-labelledby="catalog-viewer-title"
        onClose={() => setActiveProductId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActiveProductId(null);
        }}
        onKeyDown={handleViewerKeyDown}
      >
        {activeProduct && (
          <div className="gallery-viewer__content">
            <button
              className="gallery-viewer__close"
              type="button"
              aria-label="Cerrar foto ampliada"
              ref={closeButtonRef}
              onClick={() => setActiveProductId(null)}
            >
              <span aria-hidden="true">×</span>
              <span>Cerrar</span>
            </button>
            <div className="gallery-viewer__photo-row">
              {canNavigate ? (
                <button className="gallery-viewer__arrow" type="button" aria-label="Ver producto anterior" onClick={() => showProduct(-1)}>
                  <span aria-hidden="true">←</span>
                </button>
              ) : <span aria-hidden="true" />}
              <img className="gallery-viewer__image" src={activeProduct.image} alt={activeProduct.imageAlt} />
              {canNavigate ? (
                <button className="gallery-viewer__arrow" type="button" aria-label="Ver producto siguiente" onClick={() => showProduct(1)}>
                  <span aria-hidden="true">→</span>
                </button>
              ) : <span aria-hidden="true" />}
            </div>
            <div className="gallery-viewer__caption">
              <span>{activeProduct.categoryLabel} · {activeIndex + 1} de {viewerProducts.length}</span>
              <h2 id="catalog-viewer-title">{activeProduct.name}</h2>
              <p className="catalog-viewer__species">{activeProduct.species}</p>
              <p>{activeProduct.description}</p>
              <p>{activeProduct.note}</p>
              <p className="catalog-viewer__quality">Foto original en máxima calidad</p>
              <div className="catalog-viewer__actions">
                <strong className="catalog-viewer__price">{formatPrice(activeProduct.price)}</strong>
                <button className="button button--dark" type="button" onClick={handleViewerAdd}>
                  <span aria-hidden="true">+</span> Agregar al pedido
                </button>
              </div>
              <p className="catalog-viewer__added" role="status" aria-live="polite">
                {addedProductId === activeProduct.id ? 'Agregado a tu pedido.' : ''}
              </p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
