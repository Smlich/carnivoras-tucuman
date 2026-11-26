import { useEffect, useState } from 'react';
import {
  fetchAdminAssistantStatus,
  generateAdminAssistantCopy,
} from '../../services/admin-api';
import { compressImageForAssistant } from '../../services/assistant-api';

async function prepareImageForCopilot({ imageUrl, uploadedFile }) {
  if (imageUrl && imageUrl.startsWith('/api/media/')) {
    return { imageUrl };
  }
  if (uploadedFile) {
    const compressed = await compressImageForAssistant(uploadedFile);
    return compressed ? { image: compressed } : {};
  }
  if (imageUrl && imageUrl.startsWith('/')) {
    try {
      const response = await fetch(imageUrl, { cache: 'force-cache' });
      if (!response.ok) return {};
      const blob = await response.blob();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) return {};
      const file = new File([blob], 'foto.jpg', { type: blob.type });
      const compressed = await compressImageForAssistant(file);
      return compressed ? { image: compressed } : {};
    } catch {
      return {};
    }
  }
  return {};
}

export default function AdminAiCopilot({ target = 'product', context = {}, imageUrl = '', uploadedFile = null, onApply }) {
  const [aiStatus, setAiStatus] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    let active = true;
    fetchAdminAssistantStatus()
      .then((status) => {
        if (active) setAiStatus(status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError('');
    try {
      const imagePayload = await prepareImageForCopilot({ imageUrl, uploadedFile });
      const data = await generateAdminAssistantCopy({
        target,
        name: context.name || '',
        species: context.species || '',
        category: context.category || '',
        price: context.price,
        note: context.note || '',
        existingDescription: context.existingDescription || '',
        ...imagePayload,
      });
      setSuggestion(data);
      setAiStatus((prev) => (prev ? { ...prev, adminUsedToday: (prev.adminUsedToday || 0) + 1 } : prev));
    } catch (err) {
      setError(err.message || 'No pudimos generar textos con Gemini.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyText(key, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? '' : current)), 2200);
    } catch {
      setError('Tu navegador bloqueó el portapapeles; podés copiar el texto manualmente.');
    }
  }

  const enabled = aiStatus ? Boolean(aiStatus.enabled) : true;

  return (
    <div className="admin-ai-box">
      <div className="admin-ai-box__head">
        <div>
          <strong>Copiloto IA (Gemini)</strong>
          {aiStatus?.enabled ? (
            <small>{aiStatus.model} · {aiStatus.adminUsedToday ?? 0}/{aiStatus.adminDailyLimit ?? 80} usos admin hoy</small>
          ) : aiStatus ? (
            <small>Configurá <code>GEMINI_API_KEY</code> en Netlify para activar sugerencias automáticas.</small>
          ) : (
            <small>Comprobando disponibilidad…</small>
          )}
        </div>
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={handleGenerate}
          disabled={isGenerating || !enabled}
        >
          {isGenerating ? 'Analizando foto y datos…' : '✨ Sugerir descripción, alt y redes con IA'}
        </button>
      </div>

      {error && <p className="admin-ai-box__error" role="alert">{error}</p>}

      {suggestion && (
        <div className="admin-ai-box__result">
          <div className="admin-ai-box__preview-grid">
            <div>
              <span>Título sugerido</span>
              <p>{suggestion.suggestedTitle}</p>
            </div>
            <div>
              <span>Descripción sugerida</span>
              <p>{suggestion.description}</p>
            </div>
            <div>
              <span>Texto alternativo accesible (alt)</span>
              <p>{suggestion.altText}</p>
            </div>
          </div>

          <div className="admin-ai-box__actions">
            <button
              type="button"
              className="button button--dark"
              onClick={() => onApply?.(suggestion)}
            >
              Aplicar al formulario
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => setSuggestion(null)}
            >
              Descartar
            </button>
          </div>

          <div className="admin-ai-box__social-grid">
            {suggestion.instagramCaption && (
              <div className="admin-ai-box__social-card">
                <div className="admin-ai-box__social-head">
                  <span>Borrador Instagram (@carnivoras_tucuman)</span>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => handleCopyText('ig', suggestion.instagramCaption)}
                  >
                    {copiedKey === 'ig' ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
                <textarea rows="3" readOnly value={suggestion.instagramCaption} />
              </div>
            )}
            {suggestion.whatsappPitch && (
              <div className="admin-ai-box__social-card">
                <div className="admin-ai-box__social-head">
                  <span>Respuesta rápida WhatsApp</span>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => handleCopyText('wa', suggestion.whatsappPitch)}
                  >
                    {copiedKey === 'wa' ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
                <textarea rows="3" readOnly value={suggestion.whatsappPitch} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
