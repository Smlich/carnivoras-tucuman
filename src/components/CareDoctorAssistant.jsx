import { useEffect, useState } from 'react';
import { store } from '../config/store';
import {
  askCareAssistant,
  compressImageForAssistant,
  fetchAssistantStatus,
} from '../services/assistant-api';
import { formatPrice } from '../utils/format-price';
import { createContactUrl } from '../utils/whatsapp';

const SPECIES_OPTIONS = [
  { value: '', label: 'Elegir especie (opcional)' },
  { value: 'Venus atrapamoscas (Dionaea muscipula)', label: 'Venus atrapamoscas (Dionaea)' },
  { value: 'Drosera (rocío del sol)', label: 'Drosera (rocío del sol)' },
  { value: 'Sarracenia (trompeta)', label: 'Sarracenia (trompeta)' },
  { value: 'Nepenthes (planta jarro)', label: 'Nepenthes (jarros)' },
  { value: 'Pinguicula (grasilla)', label: 'Pinguicula (grasilla)' },
  { value: 'Otra / No estoy seguro', label: 'No estoy seguro de cuál es' },
];

const QUICK_SYMPTOMS = [
  {
    label: 'Trampas negras en Venus',
    species: 'Venus atrapamoscas (Dionaea muscipula)',
    question: 'A mi Venus se le están poniendo negras algunas trampas viejas, aunque en el centro siguen saliendo hojas.',
  },
  {
    label: 'Drosera sin gotitas',
    species: 'Drosera (rocío del sol)',
    question: 'Mi Drosera perdió las gotitas brillantes en las hojas y no sé si le falta luz o agua.',
  },
  {
    label: 'Calor fuerte en Tucumán',
    species: '',
    question: '¿Cómo cuido mi carnívora en Tucumán cuando hace mucho calor al mediodía para que no se queme?',
  },
  {
    label: 'Nepenthes sin jarros',
    species: 'Nepenthes (planta jarro)',
    question: 'Mi Nepenthes saca hojas nuevas verdes pero hace semanas que no forma jarros nuevos.',
  },
];

const SEVERITY_LABELS = {
  leve: 'Estado leve · hábito de cultivo',
  atencion: 'Requiere atención pronto',
  urgente: 'Acción prioritaria hoy',
};

export default function CareDoctorAssistant() {
  const [settings, setSettings] = useState(store);
  const [assistantEnabled, setAssistantEnabled] = useState(null);
  const [species, setSpecies] = useState('');
  const [locationContext, setLocationContext] = useState('');
  const [question, setQuestion] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [encodedImage, setEncodedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);

  useEffect(() => {
    let active = true;

    async function hydrateAssistant() {
      if (import.meta.env.VITE_STATIC_PREVIEW === 'true') {
        if (active) setAssistantEnabled(false);
        return;
      }

      try {
        if (!window.__ctSiteDataPromise) {
          window.__ctSiteDataPromise = fetch('/api/site-data', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          })
            .then((res) => (res.ok ? res.json().catch(() => null) : null))
            .catch(() => null);
        }
        const payload = await window.__ctSiteDataPromise;
        if (!active) return;

        if (payload?.data?.settings) {
          setSettings({ ...store, ...payload.data.settings });
        }
        if (typeof payload?.data?.assistantEnabled === 'boolean') {
          setAssistantEnabled(payload.data.assistantEnabled);
          return;
        }
      } catch {
        // Fallback abajo hacia /api/assistant/status.
      }

      const status = await fetchAssistantStatus();
      if (active) setAssistantEnabled(status.enabled);
    }

    hydrateAssistant();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setErrorMessage('');
    try {
      const compressed = await compressImageForAssistant(file);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setEncodedImage(compressed);
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos preparar la fotografía.');
    }
  }

  function clearPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl('');
    setEncodedImage(null);
  }

  function applyQuickSymptom(preset) {
    if (preset.species) setSpecies(preset.species);
    setQuestion(preset.question);
    setErrorMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (question.trim().length < 4) {
      setErrorMessage('Contanos brevemente qué notás en tu planta para orientarte.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await askCareAssistant({
        question: question.trim(),
        species,
        locationContext: locationContext.trim(),
        image: encodedImage,
      });
      setDiagnosis(result);
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos consultar al asistente en este momento.');
    } finally {
      setIsLoading(false);
    }
  }

  const whatsappText = [
    'Hola, consulto por los cuidados de mi planta carnívora.',
    species ? `Especie: ${species}.` : '',
    question.trim() ? `Consulta: ${question.trim()}` : '',
    locationContext.trim() ? `Condiciones: ${locationContext.trim()}.` : '',
  ].filter(Boolean).join(' ');
  const whatsappUrl = createContactUrl(whatsappText, settings);

  return (
    <div className="care-doctor">
      <div className="care-doctor__presets" role="group" aria-label="Consultas frecuentes de ejemplo">
        {QUICK_SYMPTOMS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="care-doctor__chip"
            onClick={() => applyQuickSymptom(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {assistantEnabled === false && (
        <div className="care-doctor__notice" role="status">
          <div>
            <strong>Orientación directa por WhatsApp disponible ahora</strong>
            <p>El diagnóstico automático está temporalmente en pausa, pero podés enviarnos tu duda y una foto directo al vivero.</p>
          </div>
          <a className="button button--dark" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            Consultar por WhatsApp <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      <form className="care-doctor__form" onSubmit={handleSubmit}>
        <div className="care-doctor__row">
          <label className="care-doctor__field">
            <span>Especie aproximada</span>
            <select value={species} onChange={(e) => setSpecies(e.target.value)}>
              {SPECIES_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="care-doctor__field">
            <span>Dónde la tenés y qué agua usás (opcional)</span>
            <input
              type="text"
              maxLength={120}
              value={locationContext}
              onChange={(e) => setLocationContext(e.target.value)}
              placeholder="Ej. Balcón en Yerba Buena, sol de mañana, agua de lluvia"
            />
          </label>
        </div>

        <label className="care-doctor__field">
          <span>¿Qué notás o qué querés consultar? *</span>
          <textarea
            rows="3"
            maxLength={600}
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Contanos si ves hojas negras, falta de gotas, sustrato seco, dudas de sol en Tucumán…"
          />
        </label>

        <div className="care-doctor__actions">
          <div className="care-doctor__upload-wrap">
            <label className="care-doctor__upload-btn">
              <span>{encodedImage ? 'Cambiar foto de tu planta' : 'Adjuntar foto (opcional, JPG/PNG/WebP)'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={isLoading} />
            </label>
            {photoPreviewUrl && (
              <div className="care-doctor__photo-preview">
                <img src={photoPreviewUrl} alt="Vista previa de la planta consultada" width="64" height="64" />
                <button type="button" className="care-doctor__remove-photo" onClick={clearPhoto}>
                  Quitar foto
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="button button--dark"
            disabled={isLoading || assistantEnabled === false}
            aria-busy={isLoading}
          >
            {isLoading ? 'Analizando consulta…' : 'Consultar al Doctor de carnívoras'}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="care-doctor__error" role="alert">
          <p>{errorMessage}</p>
          <a className="care-doctor__wa-inline" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            Enviar consulta por WhatsApp ↗
          </a>
        </div>
      )}

      {diagnosis && (
        <article className="care-doctor__result" aria-live="polite">
          <div className="care-doctor__result-head">
            <span className={'care-doctor__badge care-doctor__badge--' + diagnosis.severity}>
              {SEVERITY_LABELS[diagnosis.severity] || SEVERITY_LABELS.atencion}
            </span>
            <h3>Orientación botánica del vivero</h3>
          </div>
          <p className="care-doctor__summary">{diagnosis.summary}</p>

          <div className="care-doctor__cols">
            {diagnosis.steps?.length > 0 && (
              <div className="care-doctor__block">
                <h3>Qué hacer paso a paso</h3>
                <ul>
                  {diagnosis.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
            {diagnosis.possibleCauses?.length > 0 && (
              <div className="care-doctor__block">
                <h3>Causas más probables</h3>
                <ul>
                  {diagnosis.possibleCauses.map((cause) => (
                    <li key={cause}>{cause}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {diagnosis.avoid?.length > 0 && (
            <div className="care-doctor__avoid">
              <strong>Evitá ahora:</strong> {diagnosis.avoid.join(' · ')}
            </div>
          )}

          {diagnosis.tucumanTip && (
            <p className="care-doctor__tip">
              <strong>Tip para Tucumán:</strong> {diagnosis.tucumanTip}
            </p>
          )}

          {diagnosis.recommendedProducts?.length > 0 && (
            <div className="care-doctor__products">
              <h3>Si querés sumar otra planta o repuesto</h3>
              <div className="care-doctor__product-grid">
                {diagnosis.recommendedProducts.map((product) => (
                  <a key={product.id} className="care-doctor__product-card" href="/catalogo.html">
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.note}</span>
                    </div>
                    <strong>{formatPrice(product.price)}</strong>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="care-doctor__result-foot">
            <span>Orientación basada en nuestra guía. Si la planta sigue decayendo, escribinos directo.</span>
            <a className="button button--light" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              Enviar esta consulta por WhatsApp <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      )}
    </div>
  );
}
