import { useEffect, useState } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { askCatalogRecommender, fetchAssistantStatus } from '../services/assistant-api';
import { formatPrice } from '../utils/format-price';
import { createContactUrl } from '../utils/whatsapp';
import CatalogImage from './CatalogImage';

const QUICK_PROMPTS = [
  'Balcón con 3 hs de sol en Yerba Buena',
  'Mi primera planta carnívora fácil de cuidar',
  'Interior luminoso sin sol directo fuerte',
  'Combo o cultivar llamativo para regalar',
];

export default function CatalogRecommender({ products = [], onAdd }) {
  const { settings, assistantEnabled: siteAssistantEnabled, isLoaded } = useSiteContent();
  const [assistantEnabled, setAssistantEnabled] = useState(siteAssistantEnabled);
  const [query, setQuery] = useState('');
  const [sunlight, setSunlight] = useState('');
  const [experience, setExperience] = useState('');
  const [budgetMaxARS, setBudgetMaxARS] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [addedIds, setAddedIds] = useState(() => new Set());

  useEffect(() => {
    if (typeof siteAssistantEnabled === 'boolean') {
      setAssistantEnabled(siteAssistantEnabled);
      return undefined;
    }
    if (!isLoaded) return undefined;

    let active = true;
    fetchAssistantStatus().then((status) => {
      if (active) setAssistantEnabled(status.enabled);
    });
    return () => {
      active = false;
    };
  }, [isLoaded, siteAssistantEnabled]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (query.trim().length < 4) {
      setErrorMessage('Contanos un poco cómo es tu lugar o qué buscás (ej. sol, interior, regalo).');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await askCatalogRecommender({
        query: query.trim(),
        sunlight,
        experience,
        budgetMaxARS,
      });
      setResult(data);
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos armar la recomendación ahora.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddRecommended(product) {
    if (!product || typeof onAdd !== 'function') return;
    onAdd(product);
    setAddedIds((prev) => new Set(prev).add(product.id));
  }

  const whatsappUrl = createContactUrl(
    query.trim()
      ? `Hola, quisiera recomendación para elegir carnívoras: ${query.trim()}`
      : 'Hola, quisiera ayuda para elegir mi primera planta carnívora según mi espacio.',
    settings,
  );

  return (
    <section className="catalog-ai-section" aria-labelledby="recommender-title">
      <div className="page-shell">
        <div className="catalog-ai-card">
          <div className="catalog-ai-card__head">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Asesor inteligente del vivero</p>
              <h2 id="recommender-title">¿No sabés cuál elegir? Te recomendamos según tu espacio.</h2>
            </div>
            <p className="catalog-ai-card__lead">
              Contanos cuánta luz tenés en tu patio, balcón o ventana y qué buscás. Comparamos solo ejemplares disponibles de hoy.
            </p>
          </div>

          <div className="catalog-ai-presets" role="group" aria-label="Ejemplos rápidos de búsqueda">
            {QUICK_PROMPTS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="catalog-ai-chip"
                onClick={() => {
                  setQuery(preset);
                  setErrorMessage('');
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {assistantEnabled === false ? (
            <div className="catalog-ai-fallback" role="status">
              <p>Nuestro asesor interactivo está descansando un momento, pero te ayudamos al instante por WhatsApp según la luz de tu casa.</p>
              <a className="button button--dark" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Pedir recomendación por WhatsApp <span aria-hidden="true">↗</span>
              </a>
            </div>
          ) : (
            <form className="catalog-ai-form" onSubmit={handleSubmit}>
              <label className="catalog-ai-field catalog-ai-field--wide">
                <span>¿Cómo es tu lugar o qué buscás?</span>
                <input
                  type="text"
                  maxLength={500}
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej. Tengo balcón con sol de mañana en San Miguel y es mi primera planta"
                />
              </label>

              <div className="catalog-ai-row">
                <label className="catalog-ai-field">
                  <span>Luz disponible (opcional)</span>
                  <select value={sunlight} onChange={(e) => setSunlight(e.target.value)}>
                    <option value="">Indistinto / Contame vos</option>
                    <option value="sol-directo">Sol directo (4+ horas)</option>
                    <option value="sol-parcial">Sol suave o parcial (2–4 hs)</option>
                    <option value="luz-brillante-sin-sol">Luz brillante sin sol directo</option>
                    <option value="interior-luminoso">Ventana interior muy luminosa</option>
                  </select>
                </label>

                <label className="catalog-ai-field">
                  <span>Experiencia</span>
                  <select value={experience} onChange={(e) => setExperience(e.target.value)}>
                    <option value="">Cualquiera</option>
                    <option value="principiante">Primera carnívora</option>
                    <option value="intermedio">Ya tuve alguna</option>
                    <option value="coleccionista">Busco cultivares</option>
                  </select>
                </label>

                <label className="catalog-ai-field">
                  <span>Tope ARS (opcional)</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={budgetMaxARS}
                    onChange={(e) => setBudgetMaxARS(e.target.value)}
                    placeholder="Ej. 15000"
                  />
                </label>

                <button
                  type="submit"
                  className="button button--dark catalog-ai-submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? 'Buscando…' : 'Recomendar plantas'}
                </button>
              </div>
            </form>
          )}

          {errorMessage && (
            <div className="catalog-ai-error" role="alert">
              <span>{errorMessage}</span>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a>
            </div>
          )}

          {result && (
            <div className="catalog-ai-results" aria-live="polite">
              <p className="catalog-ai-intro">{result.intro}</p>

              {result.recommendations?.length > 0 ? (
                <div className="catalog-ai-grid">
                  {result.recommendations.map((rec) => {
                    const liveProduct = products.find((p) => p.id === rec.productId) || rec.product;
                    const isAdded = addedIds.has(liveProduct.id);
                    return (
                      <article key={liveProduct.id} className="catalog-ai-rec">
                        <div className="catalog-ai-rec__top">
                          <CatalogImage
                            src={liveProduct.image}
                            alt={liveProduct.imageAlt || liveProduct.name}
                            className="catalog-ai-rec__img"
                            width="72"
                            height="72"
                            sizes="72px"
                            loading="lazy"
                            decoding="async"
                          />
                          <div>
                            <span className="catalog-ai-rec__cat">{liveProduct.categoryLabel}</span>
                            <h3>{liveProduct.name}</h3>
                            <strong className="catalog-ai-rec__price">{formatPrice(liveProduct.price)}</strong>
                          </div>
                        </div>
                        <p className="catalog-ai-rec__reason">{rec.reason}</p>
                        <small className="catalog-ai-rec__care">{rec.careSummary}</small>
                        <button
                          type="button"
                          className="button button--dark catalog-ai-rec__add"
                          onClick={() => handleAddRecommended(liveProduct)}
                        >
                          {isAdded ? 'Agregado a Mi pedido ✓' : '+ Agregar al pedido'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="catalog-ai-fallback">
                  <p>No encontramos una coincidencia exacta en stock automático para ese criterio.</p>
                  <a className="button button--dark" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Consultar disponibilidad por WhatsApp <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}

              {result.generalTip && (
                <p className="catalog-ai-tip">{result.generalTip}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
