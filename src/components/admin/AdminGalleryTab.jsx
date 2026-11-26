import { useState } from 'react';
import {
  createAdminGalleryItem,
  deleteAdminGalleryItem,
  updateAdminGalleryItem,
  uploadAdminMediaFile,
} from '../../services/admin-api';

const EMPTY_GALLERY = {
  id: '',
  src: '',
  width: 960,
  height: 1280,
  label: 'Venus atrapamoscas',
  title: '',
  description: '',
  alt: '',
  isActive: true,
  sortOrder: 0,
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function readImageDimensions(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 960, height: img.naturalHeight || 1280 });
    img.onerror = () => resolve({ width: 960, height: 1280 });
    img.src = src;
  });
}

export default function AdminGalleryTab({ gallery, onChanged, onStatus }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_GALLERY, sortOrder: gallery.length });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function startNew() {
    setEditingId(null);
    setForm({ ...EMPTY_GALLERY, sortOrder: gallery.length });
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ ...item });
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadAdminMediaFile(file);
      const dims = await readImageDimensions(uploaded.url);
      setForm((c) => ({ ...c, src: uploaded.url, width: dims.width, height: dims.height }));
      onStatus({ type: 'success', text: `Fotografía "${file.name}" subida (${dims.width}×${dims.height}).` });
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        id: editingId || slugify(form.id || form.title),
        width: Number(form.width) || 960,
        height: Number(form.height) || 1280,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await updateAdminGalleryItem(editingId, payload);
        onStatus({ type: 'success', text: `Foto "${payload.title}" actualizada.` });
      } else {
        await createAdminGalleryItem(payload);
        onStatus({ type: 'success', text: `Foto "${payload.title}" agregada al álbum.` });
        startNew();
      }
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Quitar "${item.title}" del álbum del vivero?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminGalleryItem(item.id);
      if (editingId === item.id) startNew();
      onStatus({ type: 'success', text: `Foto "${item.title}" eliminada.` });
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-split">
      <section className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2>Álbum del vivero ({gallery.length})</h2>
            <p>Las fotos visibles se muestran en /vivero.html ordenadas por número.</p>
          </div>
          <button type="button" className="admin-btn-secondary" onClick={startNew}>+ Nueva foto</button>
        </div>

        <div className="admin-list">
          {gallery.map((item) => (
            <article className={'admin-item-row' + (editingId === item.id ? ' is-selected' : '')} key={item.id}>
              <img className="admin-item-row__thumb" src={item.src} alt="" width="64" height="64" />
              <div className="admin-item-row__info">
                <div className="admin-item-row__title">
                  <strong>{item.title}</strong>
                  <span className="admin-tag">{item.label}</span>
                  {item.isActive === false && <span className="admin-tag admin-tag--muted">Oculta</span>}
                </div>
                <small>{item.id} · Orden {item.sortOrder ?? 0}</small>
              </div>
              <div className="admin-item-row__actions">
                <button type="button" className="admin-btn-secondary" onClick={() => startEdit(item)}>Editar</button>
                <button type="button" className="admin-btn-danger" onClick={() => handleDelete(item)} disabled={isSaving}>Borrar</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>{editingId ? `Editar foto: ${editingId}` : 'Agregar fotografía'}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Título visible</span>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value, id: editingId ? c.id : slugify(e.target.value) }))}
              />
            </label>
            <label className="admin-field">
              <span>Identificador</span>
              <input
                type="text"
                required
                disabled={Boolean(editingId)}
                pattern="[a-z0-9-]+"
                value={form.id}
                onChange={(e) => setForm((c) => ({ ...c, id: slugify(e.target.value) }))}
              />
            </label>
          </div>

          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Género / Etiqueta</span>
              <input type="text" required value={form.label} onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Orden</span>
              <input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))} />
            </label>
          </div>

          <div className="admin-media-box">
            {form.src && <img src={form.src} alt="Vista previa" className="admin-media-box__preview" />}
            <div className="admin-media-box__fields">
              <label className="admin-field">
                <span>URL o ruta de imagen</span>
                <input type="text" required value={form.src} onChange={(e) => setForm((c) => ({ ...c, src: e.target.value }))} />
              </label>
              <label className="admin-upload-btn">
                <span>{isUploading ? 'Subiendo…' : 'Subir nueva fotografía (máx 2 MB)'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isUploading} />
              </label>
            </div>
          </div>

          <label className="admin-field">
            <span>Descripción</span>
            <textarea rows="2" required value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Texto alternativo (alt)</span>
            <input type="text" required value={form.alt} onChange={(e) => setForm((c) => ({ ...c, alt: e.target.value }))} />
          </label>

          <label className="admin-checkbox">
            <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            <span>Mostrar fotografía en el álbum público</span>
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="button button--dark" disabled={isSaving || isUploading}>
              {isSaving ? 'Guardando…' : (editingId ? 'Guardar foto' : 'Agregar foto')}
            </button>
            {editingId && <button type="button" className="admin-btn-secondary" onClick={startNew}>Cancelar</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
