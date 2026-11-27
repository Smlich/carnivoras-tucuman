import { useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import CatalogLightbox from './CatalogLightbox';
import ProductCard from './ProductCard';

const SITE_DIRECTORY = [
  {
    title: 'Catálogo completo',
    description: 'Explorá todas las especies, combos, promociones y cultivares con fotos ampliables en alta definición.',
    href: '/catalogo.html',
    cta: 'Abrir catálogo',
  },
  {
    title: 'Álbum del vivero',
    description: 'Fotografías reales de nuestras trampas, gotas de mucílago, jarros y floraciones en cultivo tucumano.',
    href: '/vivero.html',
    cta: 'Ver álbum',
  },
  {
    title: 'Guía ilustrada de cuidados',
    description: 'Aprendé con láminas botánicas y paso a paso el riego por bandeja, luz solar y sustratos inertes.',
    href: '/cuidados.html',
    cta: 'Leer guía',
  },
  {
    title: 'Zona de juegos gratis',
    description: 'Jugá gratis en línea a Dionaea Strike — Carnívora vs Moscas Alien con tu cuenta de Google.',
    href: '/juegos.html',
    cta: 'Explorar juegos',
  },
];

function selectFeaturedProducts(products, featuredIds) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const picked = (featuredIds || []).map((id) => byId.get(id)).filter(Boolean);
  if (picked.length > 0) return picked;
  return products.slice(0, 4);
}

export default function HomeHighlights({ products, onAdd }) {
  const { settings } = useSiteContent();
  const [activeProductId, setActiveProductId] = useState(null);
  const [addedProductId, setAddedProductId] = useState(null);

  const featuredProducts = selectFeaturedProducts(products, settings.featuredProductIds);
  const activeProduct = activeProductId === null
    ? null
    : featuredProducts.find((product) => product.id === activeProductId) ?? null;

  function openProduct(product) {
    setAddedProductId(null);
    setActiveProductId(product.id);
  }

  function handleSelectProduct(productId) {
    setAddedProductId(null);
    setActiveProductId(productId);
  }

  function handleLightboxAdd(product) {
    onAdd(product);
    setAddedProductId(product.id);
  }

  return (
    <>
      <section className="catalog-section home-highlights section-pad" aria-labelledby="featured-title">
        <div className="page-shell">
          <div className="section-heading section-heading--catalog">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Destacadas del vivero</p>
              <h2 id="featured-title">Ejemplares ideales para <em>empezar hoy.</em></h2>
            </div>
            <p className="section-heading__aside">
              Seleccionamos {featuredProducts.length} {featuredProducts.length === 1 ? 'opción clave' : 'opciones clave'} entre combos, clásicos y cultivares de colección. En el catálogo completo podés buscar y filtrar todo el stock.
            </p>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onAdd={onAdd} onInspect={openProduct} />
            ))}
          </div>

          <div className="home-highlights__footer">
            <a className="button button--dark" href="/catalogo.html">
              Ver el catálogo completo ({products.length} plantas) <span aria-hidden="true">→</span>
            </a>
            <a className="text-link" href="/cuidados.html">
              Consultar guía de cuidados antes de elegir <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <CatalogLightbox
          products={featuredProducts}
          activeProduct={activeProduct}
          addedProductId={addedProductId}
          onClose={() => setActiveProductId(null)}
          onSelectProduct={handleSelectProduct}
          onAdd={handleLightboxAdd}
        />
      </section>

      <section className="home-directory section-pad" aria-labelledby="directory-title">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Sitio organizado</p>
              <h2 id="directory-title">Todo lo del vivero, en <em>páginas dedicadas.</em></h2>
            </div>
            <p className="section-heading__aside">
              Separamos catálogo, galería real, guía ilustrada, juegos y contacto para que navegues rápido y sin distracciones.
            </p>
          </div>

          <div className="home-directory__grid">
            {SITE_DIRECTORY.map((item) => (
              <a className="directory-card" key={item.href} href={item.href}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="directory-card__cta">{item.cta} <span aria-hidden="true">→</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
