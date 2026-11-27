import { useState } from 'react';
import CatalogImage from '../components/CatalogImage';
import CatalogLightbox from '../components/CatalogLightbox';
import PageBanner from '../components/PageBanner';
import ProductCard from '../components/ProductCard';
import StoreLayout from '../components/StoreLayout';
import { useSiteContent } from '../context/SiteContentContext';
import { getSpeciesBySlug, matchProductsForSpecies, SPECIES_SEO_PAGES } from '../data/species-seo';
import { createContactUrl } from '../utils/whatsapp';

function SpeciesContent({ slug, products, onAdd }) {
  const { settings } = useSiteContent();
  const species = getSpeciesBySlug(slug);
  const matchingProducts = matchProductsForSpecies(products, species);
  const [activeProductId, setActiveProductId] = useState(null);
  const [addedProductId, setAddedProductId] = useState(null);

  const activeProduct = activeProductId === null
    ? null
    : matchingProducts.find((item) => item.id === activeProductId) ?? null;

  const whatsappInquiryUrl = createContactUrl(
    `Hola, quisiera consultar por disponibilidad y precios de ${species.shortName} en Tucumán.`,
    settings,
  );
  const otherSpecies = SPECIES_SEO_PAGES.filter((entry) => entry.slug !== species.slug);

  return (
    <>
      <PageBanner
        currentLabel={species.shortName}
        eyebrow={species.scientificName}
        title={<>{species.h1Prefix} <em>{species.h1Emphasis}</em></>}
        lead={species.lead}
      />

      <section className="catalog-section section-pad" aria-labelledby="species-stock-title">
        <div className="page-shell">
          <div className="section-heading section-heading--catalog">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Ejemplares y disponibilidad</p>
              <h2 id="species-stock-title">{species.shortName} en <em>nuestro catálogo.</em></h2>
            </div>
            <p className="section-heading__aside">
              Fotos reales de nuestro vivero en Tucumán. Tocá cualquier tarjeta para ampliarla o sumarla a tu consulta por WhatsApp.
            </p>
          </div>

          {matchingProducts.length > 0 ? (
            <>
              <div className="product-grid">
                {matchingProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={onAdd}
                    onInspect={(item) => {
                      setAddedProductId(null);
                      setActiveProductId(item.id);
                    }}
                  />
                ))}
              </div>
              <div className="home-highlights__footer">
                <a className="button button--dark" href="/catalogo.html">
                  Ver todo el catálogo ({products.length} plantas) <span aria-hidden="true">→</span>
                </a>
                <a className="text-link" href={whatsappInquiryUrl} target="_blank" rel="noopener noreferrer">
                  Consultar sobre {species.shortName} por WhatsApp <span aria-hidden="true">↗</span>
                </a>
              </div>
              <CatalogLightbox
                products={matchingProducts}
                activeProduct={activeProduct}
                addedProductId={addedProductId}
                onClose={() => setActiveProductId(null)}
                onSelectProduct={(id) => {
                  setAddedProductId(null);
                  setActiveProductId(id);
                }}
                onAdd={(product) => {
                  onAdd(product);
                  setAddedProductId(product.id);
                }}
              />
            </>
          ) : (
            <div className="species-seasonal-card">
              <div className="species-seasonal-card__media">
                <CatalogImage
                  src={species.heroImage}
                  alt={species.heroImageAlt}
                  className="species-seasonal-card__img"
                  sizes="(max-width: 760px) 92vw, 320px"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="species-seasonal-card__body">
                <p className="eyebrow"><span className="eyebrow__line" /> Cultivo estacional</p>
                <h3>Disponibilidad por camadas del vivero</h3>
                <p>
                  Las {species.shortName} se publican apenas salen de aclimatación. Si hoy no figuran en stock en línea, podés escribirnos para reservar o consultar cuándo sale la próxima tanda en Tucumán.
                </p>
                <div className="species-seasonal-card__actions">
                  <a className="button button--dark" href={whatsappInquiryUrl} target="_blank" rel="noopener noreferrer">
                    Consultar próxima tanda por WhatsApp <span aria-hidden="true">↗</span>
                  </a>
                  <a className="text-link" href="/catalogo.html">
                    Ver especies disponibles ahora <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="species-care-section section-pad" aria-labelledby="species-care-title">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Cuidados en Tucumán</p>
              <h2 id="species-care-title">Cómo mantener sana tu <em>{species.shortName}.</em></h2>
            </div>
            <p className="section-heading__aside">
              Reglas prácticas adaptadas al sol intenso del verano y al invierno suave de San Miguel de Tucumán, Yerba Buena y alrededores.
            </p>
          </div>

          <dl className="species-care-grid">
            {species.careItems.map((item) => (
              <div className="species-care-card" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="home-highlights__footer">
            <a className="button button--dark" href="/cuidados.html">
              Abrir guía ilustrada de cuidados <span aria-hidden="true">→</span>
            </a>
            <a className="text-link" href="/vivero.html">
              Ver fotos reales del vivero <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="species-faq-section section-pad" aria-labelledby="species-faq-title">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Preguntas frecuentes</p>
              <h2 id="species-faq-title">Dudas comunes sobre <em>{species.shortName}.</em></h2>
            </div>
          </div>

          <div className="species-faq-list">
            {species.faqs.map((faq) => (
              <details className="species-faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-directory section-pad" aria-labelledby="other-species-title">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Seguir explorando</p>
              <h2 id="other-species-title">Otras especies de <em>Carnívoras Tucumán.</em></h2>
            </div>
          </div>

          <div className="home-directory__grid">
            {otherSpecies.map((entry) => (
              <a className="directory-card" key={entry.slug} href={`/${entry.slug}.html`}>
                <h3>{entry.shortName}</h3>
                <p>{entry.lead}</p>
                <span>Ver ficha en Tucumán →</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function SpeciesLandingPage({ slug }) {
  return (
    <StoreLayout currentPage="catalogo">
      {({ products, onAdd }) => <SpeciesContent slug={slug} products={products} onAdd={onAdd} />}
    </StoreLayout>
  );
}
