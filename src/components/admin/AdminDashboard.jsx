import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import {
  fetchAdminGallery,
  fetchAdminGames,
  fetchAdminOrders,
  fetchAdminOverview,
  fetchAdminProducts,
  fetchAdminSettings,
  fetchAdminUsers,
  logoutAdmin,
} from '../../services/admin-api';
import CatalogImage from '../CatalogImage';
import AdminGalleryTab from './AdminGalleryTab';
import AdminGamesTab from './AdminGamesTab';
import AdminOrdersAccountTab from './AdminOrdersAccountTab';
import AdminProductsTab from './AdminProductsTab';
import AdminSettingsTab from './AdminSettingsTab';

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'products', label: 'Catálogo' },
  { id: 'settings', label: 'Textos y Sitio' },
  { id: 'gallery', label: 'Álbum' },
  { id: 'games', label: 'Juegos' },
  { id: 'account', label: 'Pedidos y Cuenta' },
];

export default function AdminDashboard() {
  const { admin, user, enabled, providers, refreshAdminSession, signOut } = useAuth();
  const { reloadSiteData } = useSiteContent();
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    settings: null,
    products: [],
    gallery: [],
    games: [],
    orders: [],
    users: [],
  });

  const loadAll = useCallback(async () => {
    try {
      const [overview, settings, products, gallery, games, orders, users] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminSettings(),
        fetchAdminProducts(),
        fetchAdminGallery(),
        fetchAdminGames(),
        fetchAdminOrders(),
        fetchAdminUsers().catch(() => []),
      ]);
      setData({ overview, settings, products, gallery, games, orders, users: Array.isArray(users) ? users : [] });
      await reloadSiteData();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [reloadSiteData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    try {
      await logoutAdmin();
      if (admin?.method === 'google' || user) {
        await signOut().catch(() => {});
      }
    } finally {
      await refreshAdminSession();
    }
  }

  const googleActive = Boolean(data.overview?.googleOAuthConfigured || (enabled && providers.includes('google')));

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="page-shell admin-topbar__inner">
          <div className="admin-topbar__brand">
            <CatalogImage src="/images/catalog/logo-dark.png" alt="" className="footer-brand__logo" sizes="44px" />
            <div>
              <strong>Carnívoras Tucumán · Admin</strong>
              <small>{admin?.name} ({admin?.email})</small>
            </div>
          </div>
          <div className="admin-topbar__actions">
            <a className="admin-topbar__link" href="/">Ver tienda ↗</a>
            <a className="admin-topbar__link" href="/juegos.html">Probar juegos ↗</a>
            <button type="button" className="admin-topbar__logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="page-shell admin-main">
        <nav className="admin-tabs" role="tablist" aria-label="Secciones de administración">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={'admin-tab' + (activeTab === tab.id ? ' is-active' : '')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {status && (
          <div className={'admin-alert ' + (status.type === 'error' ? 'admin-alert--error' : 'admin-alert--success')} role="status">
            <span>{status.text}</span>
            <button type="button" onClick={() => setStatus(null)} aria-label="Cerrar mensaje">×</button>
          </div>
        )}

        {isLoading ? (
          <p className="admin-loading">Cargando panel de administración…</p>
        ) : (
          <>
            {activeTab === 'overview' && (
              <section className="admin-overview" aria-labelledby="overview-title">
                <h1 id="overview-title" className="visually-hidden">Resumen general del sitio</h1>
                <div className="admin-kpi-grid">
                  <article className="admin-kpi">
                    <span>Visitas compartidas</span>
                    <strong>{data.overview?.visitsCount ?? 0}</strong>
                    <small>Acumuladas del vivero</small>
                  </article>
                  <article className="admin-kpi">
                    <span>Productos en catálogo</span>
                    <strong>{data.overview?.activeProducts ?? 0} / {data.overview?.productsTotal ?? 0}</strong>
                    <small>Activos vs total</small>
                  </article>
                  <article className="admin-kpi">
                    <span>Consultas de pedidos</span>
                    <strong>{data.overview?.pendingOrders ?? 0} pendientes</strong>
                    <small>{data.overview?.ordersTotal ?? 0} registradas</small>
                  </article>
                  <article className="admin-kpi">
                    <span>Álbum y Juegos</span>
                    <strong>{data.overview?.galleryTotal ?? 0} fotos · {data.overview?.gamesTotal ?? 0} juegos</strong>
                    <small>Almacenamiento: {data.overview?.storageMode || 'activo'}</small>
                  </article>
                  <article className="admin-kpi">
                    <span>Clientes con Google</span>
                    <strong>{data.overview?.usersTotal ?? data.users.length}</strong>
                    <small>{googleActive ? 'Registro con Google activo' : 'Falta activar credenciales OAuth'}</small>
                  </article>
                </div>

                <div className="admin-panel admin-oauth-status">
                  <h2>Registro de clientes con Google</h2>
                  {googleActive ? (
                    <p>
                      El inicio de sesión con Google está <strong>activo</strong>. Los clientes pueden registrarse desde el botón «Ingresar» o en «Juegos gratis», y sus pedidos por WhatsApp informan su nombre y cuenta verificada.
                    </p>
                  ) : (
                    <p>
                      Todavía faltan las variables <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> en Netlify (y autorizar el URI <code>{`${window.location.origin}/api/auth/callback/google`}</code> en Google Cloud Console). Si también cargás tu Gmail en <code>ADMIN_EMAILS</code>, entrar con Google te activará el modo Admin automáticamente.
                    </p>
                  )}
                </div>

                <div className="admin-panel admin-overview__shortcuts">
                  <h2>Accesos rápidos</h2>
                  <div className="admin-head-buttons">
                    <button type="button" className="button button--dark" onClick={() => setActiveTab('products')}>
                      Administrar catálogo
                    </button>
                    <button type="button" className="admin-btn-secondary" onClick={() => setActiveTab('games')}>
                      Configurar juego / Modo Admin
                    </button>
                    <button type="button" className="admin-btn-secondary" onClick={() => setActiveTab('settings')}>
                      Editar textos y contador
                    </button>
                    <button type="button" className="admin-btn-secondary" onClick={() => setActiveTab('account')}>
                      Ver pedidos y cuenta
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'products' && (
              <AdminProductsTab products={data.products} onChanged={loadAll} onStatus={setStatus} />
            )}

            {activeTab === 'settings' && data.settings && (
              <AdminSettingsTab settings={data.settings} products={data.products} onChanged={loadAll} onStatus={setStatus} />
            )}

            {activeTab === 'gallery' && (
              <AdminGalleryTab gallery={data.gallery} onChanged={loadAll} onStatus={setStatus} />
            )}

            {activeTab === 'games' && (
              <AdminGamesTab games={data.games} onChanged={loadAll} onStatus={setStatus} />
            )}

            {activeTab === 'account' && (
              <AdminOrdersAccountTab
                adminUser={admin}
                orders={data.orders}
                users={data.users}
                onChanged={loadAll}
                onAccountChanged={refreshAdminSession}
                onStatus={setStatus}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
