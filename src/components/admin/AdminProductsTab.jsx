import { useState } from 'react';
import {
  createAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
  uploadAdminMediaFile,
} from '../../services/admin-api';
import { formatPrice } from '../../utils/format-price';
import AdminAiCopilot from './AdminAiCopilot';

const EMPTY_FORM = {
  id: '',
  name: '',
  species: '',
  description: '',
  price: 5000,
  category: 'venus',
  categoryLabel: 'Venus',
  image: '/images/catalog/venus-small.png',
  imageAlt: '',
  note: 'Maceta n.º 6',
  stockStatus: 'available',
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

const STOCK_LABELS = {
  available: 'Disponible',
  ask: 'Consultar',
  unavailable: 'Sin stock',
};

export default function AdminProductsTab({ products, onChanged, onStatus }) {
  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function startNew() {
    setEditingId(null);
    setSlugTouched(false);
    setLastUploadedFile(null);
    setForm({ ...EMPTY_FORM, sortOrder: products.length });
  }

  function startEdit(product) {
    setEditingId(product.id);
    setSlugTouched(true);
    setLastUploadedFile(null);
    setForm({
      id: product.id,
      name: product.name,
      species: product.species,
      description: product.description,
      price: product.price,
      category: product.category,
      categoryLabel: product.categoryLabel,
      image: product.image,
      imageAlt: product.imageAlt,
      note: product.note,
      stockStatus: product.stockStatus || 'ask',
      isActive: product.isActive !== false,
      sortOrder: product.sortOrder ?? 0,
    });
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadAdminMediaFile(file);
      setLastUploadedFile(file);
      setForm((current) => ({ ...current, image: uploaded.url }));
      onStatus({ type: 'success', text: `Imagen "${file.name}" subida y lista para guardar.` });
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
        id: editingId || slugify(form.id || form.name),
        price: Number(form.price),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await updateAdminProduct(editingId, payload);
        onStatus({ type: 'success', text: `Producto "${payload.name}" actualizado.` });
      } else {
        await createAdminProduct(payload);
        onStatus({ type: 'success', text: `Producto "${payload.name}" agregado al catálogo.` });
        startNew();
      }
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminProduct(product.id);
      if (editingId === product.id) startNew();
      onStatus({ type: 'success', text: `Producto "${product.name}" eliminado.` });
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-split">
      <section className="admin-panel" aria-labelledby="products-list-title">
        <div className="admin-panel__head">
          <div>
            <h2 id="products-list-title">Catálogo ({products.length})</h2>
            <p>Editá precios, disponibilidad o el orden en que aparecen en la tienda.</p>
          </div>
          <button type="button" className="admin-btn-secondary" onClick={startNew}>
            + Nuevo producto
          </button>
        </div>

        <div className="admin-list">
          {products.map((product) => (
            <article className={'admin-item-row' + (editingId === product.id ? ' is-selected' : '')} key={product.id}>
              <img className="admin-item-row__thumb" src={product.image} alt="" width="64" height="64" />
              <div className="admin-item-row__info">
                <div className="admin-item-row__title">
                  <strong>{product.name}</strong>
                  <span className="admin-tag">{formatPrice(product.price)}</span>
                  <span className={'admin-tag admin-tag--stock-' + (product.stockStatus || 'ask')}>
                    {STOCK_LABELS[product.stockStatus] || 'Consultar'}
                  </span>
                  {product.isActive === false && <span className="admin-tag admin-tag--muted">Oculto</span>}
                </div>
                <small>{product.id} · {product.categoryLabel} · Orden {product.sortOrder ?? 0}</small>
              </div>
              <div className="admin-item-row__actions">
                <button type="button" className="admin-btn-secondary" onClick={() => startEdit(product)}>Editar</button>
                <button type="button" className="admin-btn-danger" onClick={() => handleDelete(product)} disabled={isSaving}>Borrar</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="product-form-title">
        <h2 id="product-form-title">{editingId ? `Editar: ${editingId}` : 'Crear producto nuevo'}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Nombre</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((c) => ({
                  ...c,
                  name: e.target.value,
                  id: editingId || slugTouched ? c.id : slugify(e.target.value),
                }))}
              />
            </label>
            <label className="admin-field">
              <span>Identificador (slug)</span>
              <input
                type="text"
                required
                disabled={Boolean(editingId)}
                pattern="[a-z0-9-]+"
                value={form.id}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((c) => ({ ...c, id: slugify(e.target.value) }));
                }}
              />
            </label>
          </div>

          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Especie científica</span>
              <input type="text" required value={form.species} onChange={(e) => setForm((c) => ({ ...c, species: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Precio en ARS</span>
              <input type="number" min="0" step="100" required value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} />
            </label>
          </div>

          <div className="admin-grid-3">
            <label className="admin-field">
              <span>Categoría</span>
              <select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}>
                <option value="combos">Combos y promos</option>
                <option value="venus">Venus atrapamoscas</option>
                <option value="otras">Otras especies</option>
                <option value="especiales">Cultivares</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Etiqueta visible</span>
              <input type="text" required value={form.categoryLabel} onChange={(e) => setForm((c) => ({ ...c, categoryLabel: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Stock</span>
              <select value={form.stockStatus} onChange={(e) => setForm((c) => ({ ...c, stockStatus: e.target.value }))}>
                <option value="available">Disponible</option>
                <option value="ask">Consultar</option>
                <option value="unavailable">Sin stock</option>
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>Descripción</span>
            <textarea rows="2" required value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>

          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Nota inferior (ej. maceta / promo)</span>
              <input type="text" required value={form.note} onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Orden de aparición</span>
              <input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))} />
            </label>
          </div>

          <div className="admin-media-box">
            {form.image && <img src={form.image} alt="Vista previa" className="admin-media-box__preview" />}
            <div className="admin-media-box__fields">
              <label className="admin-field">
                <span>URL o ruta de la foto</span>
                <input type="text" required value={form.image} onChange={(e) => setForm((c) => ({ ...c, image: e.target.value }))} />
              </label>
              <label className="admin-upload-btn">
                <span>{isUploading ? 'Subiendo…' : 'Subir foto nueva (PNG/JPG/WebP, máx 2 MB)'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isUploading} />
              </label>
            </div>
          </div>

          <AdminAiCopilot
            target="product"
            context={{
              name: form.name,
              species: form.species,
              category: form.categoryLabel || form.category,
              price: form.price,
              note: form.note,
              existingDescription: form.description,
            }}
            imageUrl={form.image}
            uploadedFile={lastUploadedFile}
            onApply={(suggestion) => {
              setForm((c) => {
                const nextName = c.name.trim() ? c.name : suggestion.suggestedTitle;
                return {
                  ...c,
                  name: nextName,
                  id: editingId || slugTouched ? c.id : slugify(nextName),
                  description: suggestion.description || c.description,
                  imageAlt: suggestion.altText || c.imageAlt,
                };
              });
              onStatus({ type: 'success', text: 'Sugerencias aplicadas al formulario. Revisalas y guardá.' });
            }}
          />

          <label className="admin-field">
            <span>Texto alternativo accesible (alt)</span>
            <input type="text" required value={form.imageAlt} onChange={(e) => setForm((c) => ({ ...c, imageAlt: e.target.value }))} />
          </label>

          <label className="admin-checkbox">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            <span>Mostrar producto en el catálogo público</span>
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="button button--dark" disabled={isSaving || isUploading}>
              {isSaving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Crear producto')}
            </button>
            {editingId && (
              <button type="button" className="admin-btn-secondary" onClick={startNew}>Cancelar edición</button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
