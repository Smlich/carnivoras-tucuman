import { useMemo, useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { normalizeSearchText } from '../utils/normalize-text';
import CatalogLightbox from './CatalogLightbox';
import ProductCard from './ProductCard';

const filters = [
  { id: 'todos', label: 'Todo el catálogo' },
  { id: 'combos', label: 'Combos y promos' },
  { id: 'venus', label: 'Venus atrapamoscas' },
  { id: 'otras', label: 'Otras especies' },
  { id: 'especiales', label: 'Cultivares' },
];

export default function ProductCatalog({ products: catalogProducts, onAdd, showHeading = true }) {
  const { settings } = useSiteContent();
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProductId, setActiveProductId] = useState(null);
  const [addedProductId, setAddedProductId] = useState(null);

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

  function openProduct(product) {
    setAddedProductId(null);
    setActiveProductId(product.id);
  }

  function handleSelectProduct(productId) {
    setAddedProductId(null);
    setActiveProductId(productId);
  }

  function handleViewerAdd(product) {
    onAdd(product);
    setAddedProductId(product.id);
  }

  const resultAnnouncement = visibleProducts.length === 0
    ? 'No se encontraron plantas.'
    : visibleProducts.length === 1
      ? 'Se encontró 1 planta.'
      : `Se encontraron ${visibleProducts.length} plantas.`;

  return (
    <section className="catalog-section section-pad" id="catalogo" aria-labelledby={showHeading ? 'catalog-title' : undefined} aria-label={showHeading ? undefined : 'Catálogo de plantas carnívoras'}>
      <div className="page-shell">
        {showHeading ? (
          <div className="section-heading section-heading--catalog">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Nuestro catálogo</p>
              <h2 id="catalog-title">Pequeñas maravillas, <em>grandes personalidades.</em></h2>
            </div>
            <p className="section-heading__aside">Elegí tus favoritas y armá una consulta. Te confirmamos disponibilidad y entrega desde {settings.city}.</p>
          </div>
        ) : (
          <h2 className="visually-hidden">Lista de plantas y precios</h2>
        )}

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

        <p className="catalog-note">
          {settings.priceFreezeEnabled && settings.priceFreezeLabel
            ? `Precios de referencia en pesos argentinos (${settings.priceFreezeLabel.toLowerCase()}). Tocá cualquier foto para ampliarla.`
            : 'Precios de referencia en pesos argentinos. Tocá cualquier foto para ampliarla.'}
        </p>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onAdd={onAdd} onInspect={openProduct} />
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

      <CatalogLightbox
        products={viewerProducts}
        activeProduct={activeProduct}
        addedProductId={addedProductId}
        onClose={() => setActiveProductId(null)}
        onSelectProduct={handleSelectProduct}
        onAdd={handleViewerAdd}
      />
    </section>
  );
}
