import { useState } from 'react';
import {
  createAdminGame,
  deleteAdminGame,
  updateAdminGame,
} from '../../services/admin-api';

const EMPTY_GAME = {
  slug: '',
  title: '',
  description: '',
  status: 'coming-soon',
  requiresAuth: true,
  platform: 'Google AI Studio',
  embedUrl: '',
  adminEmbedUrl: '',
  aspectRatio: '16 / 9',
  badge: 'Gratis con Google',
  adminProps: { adminMode: true, debugTools: true, unlockAll: true },
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

export default function AdminGamesTab({ games, onChanged, onStatus }) {
  const [editingSlug, setEditingSlug] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_GAME, sortOrder: games.length });
  const [propsJson, setPropsJson] = useState(JSON.stringify(EMPTY_GAME.adminProps, null, 2));
  const [isSaving, setIsSaving] = useState(false);

  function startNew() {
    setEditingSlug(null);
    setSlugTouched(false);
    setForm({ ...EMPTY_GAME, sortOrder: games.length });
    setPropsJson(JSON.stringify(EMPTY_GAME.adminProps, null, 2));
  }

  function startEdit(game) {
    const props = game.adminProps && typeof game.adminProps === 'object' ? game.adminProps : {};
    setEditingSlug(game.slug);
    setSlugTouched(true);
    setForm({
      slug: game.slug,
      title: game.title,
      description: game.description,
      status: game.status || 'coming-soon',
      requiresAuth: game.requiresAuth !== false,
      platform: game.platform || 'Google AI Studio',
      embedUrl: game.embedUrl || '',
      adminEmbedUrl: game.adminEmbedUrl || '',
      aspectRatio: game.aspectRatio || '16 / 9',
      badge: game.badge || 'Gratis con Google',
      adminProps: props,
      sortOrder: game.sortOrder ?? 0,
    });
    setPropsJson(JSON.stringify(props, null, 2));
  }

  function toggleQuickProp(key) {
    try {
      const current = JSON.parse(propsJson || '{}');
      const next = { ...current, [key]: !current[key] };
      setPropsJson(JSON.stringify(next, null, 2));
    } catch {
      const next = { adminMode: true, debugTools: true, unlockAll: true, [key]: true };
      setPropsJson(JSON.stringify(next, null, 2));
    }
  }

  let parsedQuickFlags = {};
  try {
    parsedQuickFlags = JSON.parse(propsJson || '{}') || {};
  } catch {
    parsedQuickFlags = {};
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let parsedAdminProps;
    try {
      parsedAdminProps = propsJson.trim() ? JSON.parse(propsJson) : {};
      if (!parsedAdminProps || Array.isArray(parsedAdminProps) || typeof parsedAdminProps !== 'object') {
        throw new Error('Las propiedades deben ser un objeto JSON clave-valor.');
      }
    } catch (error) {
      onStatus({ type: 'error', text: 'JSON inválido en Propiedades Admin: ' + error.message });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        slug: editingSlug || slugify(form.slug || form.title),
        embedUrl: form.embedUrl.trim() || null,
        adminEmbedUrl: form.adminEmbedUrl.trim() || null,
        adminProps: parsedAdminProps,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingSlug) {
        await updateAdminGame(editingSlug, payload);
        onStatus({ type: 'success', text: `Juego "${payload.title}" actualizado.` });
      } else {
        await createAdminGame(payload);
        onStatus({ type: 'success', text: `Juego "${payload.title}" creado.` });
        startNew();
      }
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(game) {
    if (!window.confirm(`¿Eliminar el juego "${game.title}"?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminGame(game.slug);
      if (editingSlug === game.slug) startNew();
      onStatus({ type: 'success', text: `Juego "${game.title}" eliminado.` });
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
            <h2>Juegos y Modo Administrador ({games.length})</h2>
            <p>Configurá la URL de Google AI Studio y las propiedades exclusivas para tu cuenta Admin.</p>
          </div>
          <div className="admin-head-buttons">
            <a className="admin-btn-secondary" href="/juegos.html">Probar en /juegos.html ↗</a>
            <button type="button" className="admin-btn-secondary" onClick={startNew}>+ Nuevo juego</button>
          </div>
        </div>

        <div className="admin-list">
          {games.map((game) => (
            <article className={'admin-item-row' + (editingSlug === game.slug ? ' is-selected' : '')} key={game.slug}>
              <div className="admin-item-row__info">
                <div className="admin-item-row__title">
                  <strong>{game.title}</strong>
                  <span className="admin-tag">{game.status}</span>
                  <span className="admin-tag admin-tag--muted">{game.badge}</span>
                </div>
                <small>{game.slug} · {game.platform} · Embed: {game.embedUrl || 'pendiente'}</small>
              </div>
              <div className="admin-item-row__actions">
                {(game.adminEmbedUrl || game.embedUrl || '').startsWith('/jugar-') && (
                  <a className="admin-btn-secondary" href={game.adminEmbedUrl || game.embedUrl}>
                    Jugar como Admin ↗
                  </a>
                )}
                <button type="button" className="admin-btn-secondary" onClick={() => startEdit(game)}>Editar</button>
                <button type="button" className="admin-btn-danger" onClick={() => handleDelete(game)} disabled={isSaving}>Borrar</button>
              </div>
            </article>
          ))}
        </div>

        <div className="admin-callout">
          <strong>Cómo detecta tu juego de Google AI Studio al Administrador</strong>
          <p>
            Al abrirlo desde <code>/juegos.html</code> con esta sesión activa, la web le envía automáticamente por URL (<code>?role=admin&amp;isAdmin=1&amp;adminProps=...</code>) y por <code>window.postMessage</code> el evento <code>CARNIVORAS_PLAYER_CONTEXT</code> con tus propiedades. Los jugadores comunes reciben <code>role: &quot;player&quot;</code> y nunca ven <code>adminEmbedUrl</code> ni <code>adminProps</code>.
          </p>
        </div>
      </section>

      <section className="admin-panel">
        <h2>{editingSlug ? `Editar juego: ${editingSlug}` : 'Agregar juego'}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Título</span>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value, slug: editingSlug || slugTouched ? c.slug : slugify(e.target.value) }))}
              />
            </label>
            <label className="admin-field">
              <span>Slug</span>
              <input
                type="text"
                required
                disabled={Boolean(editingSlug)}
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((c) => ({ ...c, slug: slugify(e.target.value) }));
                }}
              />
            </label>
          </div>

          <label className="admin-field">
            <span>Descripción</span>
            <textarea rows="2" required value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>

          <div className="admin-grid-3">
            <label className="admin-field">
              <span>Estado</span>
              <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
                <option value="coming-soon">Próximamente</option>
                <option value="playable">Disponible (jugable)</option>
                <option value="admin-only">Solo administrador</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Insignia</span>
              <input type="text" required value={form.badge} onChange={(e) => setForm((c) => ({ ...c, badge: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>Proporción (aspect)</span>
              <input type="text" required value={form.aspectRatio} onChange={(e) => setForm((c) => ({ ...c, aspectRatio: e.target.value }))} />
            </label>
          </div>

          <div className="admin-grid-2">
            <label className="admin-field">
              <span>URL del juego para jugadores (`/games/...` o `https://...`)</span>
              <input type="text" value={form.embedUrl} onChange={(e) => setForm((c) => ({ ...c, embedUrl: e.target.value }))} placeholder="/games/vivero-carnivoro/index.html" />
            </label>
            <label className="admin-field">
              <span>URL exclusiva Admin (opcional, usa la anterior si está vacía)</span>
              <input type="text" value={form.adminEmbedUrl} onChange={(e) => setForm((c) => ({ ...c, adminEmbedUrl: e.target.value }))} placeholder="https://..." />
            </label>
          </div>

          <div className="admin-field">
            <span>Propiedades rápidas para Modo Administrador</span>
            <div className="admin-chips-row">
              {['adminMode', 'debugTools', 'unlockAll', 'godMode', 'sandbox'].map((key) => (
                <label className="admin-checkbox" key={key}>
                  <input type="checkbox" checked={Boolean(parsedQuickFlags[key])} onChange={() => toggleQuickProp(key)} />
                  <code>{key}</code>
                </label>
              ))}
            </div>
          </div>

          <label className="admin-field">
            <span>Objeto JSON enviado al juego como Administrador (`adminProps`)</span>
            <textarea rows="5" className="admin-mono-input" value={propsJson} onChange={(e) => setPropsJson(e.target.value)} />
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="button button--dark" disabled={isSaving}>
              {isSaving ? 'Guardando…' : (editingSlug ? 'Guardar juego' : 'Crear juego')}
            </button>
            {editingSlug && <button type="button" className="admin-btn-secondary" onClick={startNew}>Cancelar</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
