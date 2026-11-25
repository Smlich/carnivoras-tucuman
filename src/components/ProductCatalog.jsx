import { useEffect, useMemo, useState } from 'react';
import { store } from '../config/store';
import { products } from '../data/products';
import { fetchProducts } from '../services/products-api';
import ProductCard from './ProductCard';

const filters = [
  { id: 'todos', label: 'Todo el catálogo' },
  { id: 'combos', label: 'Combos y promos' },
  { id: 'venus', label: 'Venus atrapamoscas' },
  { id: 'otras', label: 'Otras especies' },
  { id: 'especiales', label: 'Cultivares' },
];

export default function ProductCatalog({ onAdd }) {
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogProducts, setCatalogProducts] = useState(products);

  useEffect(() => {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true') return undefined;

    const controller = new AbortController();

    fetchProducts({ signal: controller.signal })
      .then(setCatalogProducts)
      .catch((error) => {
        if (error.name !== 'AbortError') setCatalogProducts(products);
      });

    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es-AR');
    return catalogProducts.filter((product) => {
      const matchesCategory = activeFilter === 'todos' || product.category === activeFilter;
      const searchable = [product.name, product.species, product.description, product.categoryLabel].join(' ').toLocaleLowerCase('es-AR');
      return matchesCategory && searchable.includes(normalizedSearch);
    });
  }, [activeFilter, catalogProducts, searchTerm]);

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

        <p className="catalog-note"><span aria-hidden="true">i</span> Valores publicados en pesos argentinos. Consultá vigencia y stock antes de confirmar.</p>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}
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
    </section>
  );
}
