import { useEffect, useState } from 'react';
import { saveAdminSettings } from '../../services/admin-api';

export default function AdminSettingsTab({ settings, products, onChanged, onStatus }) {
  const [form, setForm] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function toggleFeatured(productId) {
    setForm((current) => {
      const exists = current.featuredProductIds.includes(productId);
      if (exists && current.featuredProductIds.length === 1) return current;
      const nextIds = exists
        ? current.featuredProductIds.filter((id) => id !== productId)
        : [...current.featuredProductIds, productId].slice(0, 8);
      return { ...current, featuredProductIds: nextIds };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const cleanAnnouncements = (form.announcementItems || []).map((item) => item.trim()).filter(Boolean);
      const saved = await saveAdminSettings({
        ...form,
        announcementItems: cleanAnnouncements.length > 0 ? cleanAnnouncements : ['Vivero botánico · ' + form.city],
      });
      setForm(saved);
      onStatus({ type: 'success', text: 'Ajustes globales y textos del sitio guardados.' });
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="admin-form admin-settings-stack" onSubmit={handleSubmit}>
      <section className="admin-panel">
        <h2>Negocio, WhatsApp y Redes</h2>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>Nombre visible</span>
            <input type="text" required value={form.storeName} onChange={(e) => setForm((c) => ({ ...c, storeName: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Ciudad</span>
            <input type="text" required value={form.city} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} />
          </label>
        </div>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>Número WhatsApp (solo dígitos, ej. 5493816168898)</span>
            <input type="text" required pattern="[0-9]{8,16}" value={form.whatsappNumber} onChange={(e) => setForm((c) => ({ ...c, whatsappNumber: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Teléfono visible</span>
            <input type="text" required value={form.whatsappDisplay} onChange={(e) => setForm((c) => ({ ...c, whatsappDisplay: e.target.value }))} />
          </label>
        </div>
        <div className="admin-grid-3">
          <label className="admin-field">
            <span>Usuario Instagram</span>
            <input type="text" required value={form.instagramHandle} onChange={(e) => setForm((c) => ({ ...c, instagramHandle: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>URL Instagram</span>
            <input type="text" required value={form.instagramUrl} onChange={(e) => setForm((c) => ({ ...c, instagramUrl: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>URL Facebook (opcional)</span>
            <input type="text" value={form.facebookUrl || ''} onChange={(e) => setForm((c) => ({ ...c, facebookUrl: e.target.value }))} />
          </label>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Aviso superior global</h2>
        <label className="admin-checkbox">
          <input type="checkbox" checked={Boolean(form.showPreviewBanner)} onChange={(e) => setForm((c) => ({ ...c, showPreviewBanner: e.target.checked }))} />
          <span>Mostrar banner superior de aviso (ej. vista de prueba o aviso de envíos)</span>
        </label>
        <label className="admin-field">
          <span>Texto del banner de aviso</span>
          <input type="text" required value={form.previewBannerText} onChange={(e) => setForm((c) => ({ ...c, previewBannerText: e.target.value }))} />
        </label>
      </section>

      <section className="admin-panel">
        <h2>Portada (Hero), Latitud y Contador de Precios</h2>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>Etiqueta superior (eyebrow)</span>
            <input type="text" required value={form.heroEyebrow} onChange={(e) => setForm((c) => ({ ...c, heroEyebrow: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Título del botón «?»</span>
            <input type="text" required value={form.heroLatInfoTitle} onChange={(e) => setForm((c) => ({ ...c, heroLatInfoTitle: e.target.value }))} />
          </label>
        </div>
        <label className="admin-field">
          <span>Explicación al abrir «?»</span>
          <textarea rows="2" required value={form.heroLatInfoText} onChange={(e) => setForm((c) => ({ ...c, heroLatInfoText: e.target.value }))} />
        </label>
        <div className="admin-grid-3">
          <label className="admin-field">
            <span>Titular · inicio</span>
            <input type="text" required value={form.heroTitlePrefix} onChange={(e) => setForm((c) => ({ ...c, heroTitlePrefix: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Palabra destacada</span>
            <input type="text" required value={form.heroTitleEmphasis} onChange={(e) => setForm((c) => ({ ...c, heroTitleEmphasis: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Titular · cierre</span>
            <input type="text" value={form.heroTitleSuffix} onChange={(e) => setForm((c) => ({ ...c, heroTitleSuffix: e.target.value }))} />
          </label>
        </div>
        <label className="admin-field">
          <span>Eslogan principal</span>
          <textarea rows="2" required value={form.heroLead} onChange={(e) => setForm((c) => ({ ...c, heroLead: e.target.value }))} />
        </label>

        <div className="admin-grid-3">
          <label className="admin-field">
            <span>Insignia del contador</span>
            <input type="text" required value={form.priceFreezeTag} onChange={(e) => setForm((c) => ({ ...c, priceFreezeTag: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Descripción del contador</span>
            <input type="text" required value={form.priceFreezeLabel} onChange={(e) => setForm((c) => ({ ...c, priceFreezeLabel: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Fecha base (AAAA-MM-DD)</span>
            <input type="date" required value={form.priceFreezeStartDate} onChange={(e) => setForm((c) => ({ ...c, priceFreezeStartDate: e.target.value }))} />
          </label>
        </div>
        <label className="admin-checkbox">
          <input type="checkbox" checked={Boolean(form.priceFreezeEnabled)} onChange={(e) => setForm((c) => ({ ...c, priceFreezeEnabled: e.target.checked }))} />
          <span>Mostrar contador en vivo de precios congelados</span>
        </label>
      </section>

      <section className="admin-panel">
        <h2>Plantas destacadas en el Inicio</h2>
        <p>Elegí hasta 8 productos para mostrar en la página principal:</p>
        <div className="admin-featured-grid">
          {products.map((product) => (
            <label className="admin-checkbox" key={product.id}>
              <input
                type="checkbox"
                checked={form.featuredProductIds.includes(product.id)}
                onChange={() => toggleFeatured(product.id)}
              />
              <span>{product.name}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="admin-form-actions">
        <button type="submit" className="button button--dark" disabled={isSaving}>
          {isSaving ? 'Guardando cambios…' : 'Guardar toda la configuración del sitio'}
        </button>
      </div>
    </form>
  );
}
