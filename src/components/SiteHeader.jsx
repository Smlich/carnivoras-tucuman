import { useAuth } from '../context/AuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import AccountMenu from './AccountMenu';
import CatalogImage from './CatalogImage';

const navLinks = [
  { id: 'inicio', label: 'Inicio', href: '/' },
  { id: 'catalogo', label: 'Catálogo', href: '/catalogo.html' },
  { id: 'vivero', label: 'Vivero', href: '/vivero.html' },
  { id: 'cuidados', label: 'Cuidados', href: '/cuidados.html' },
  { id: 'juegos', label: 'Juegos', href: '/juegos.html' },
  { id: 'contacto', label: 'Contacto', href: '/contacto.html' },
];

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bag-icon">
      <path d="M5.5 8.5h13l1 12h-15l1-12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteHeader({ currentPage = 'inicio', itemCount, onOpenCart }) {
  const { isAdmin } = useAuth();
  const { settings } = useSiteContent();

  return (
    <header className="site-header">
      <div className="site-header__inner page-shell">
        <a className="brand" href="/" aria-label={settings.storeName + ' — inicio'}>
          <CatalogImage src="/images/catalog/logo-light.png" alt="" className="brand__logo" sizes="48px" />
          <span className="brand__text">
            <strong>Carnívoras</strong>
            <span>Tucumán</span>
          </span>
        </a>

        <nav className="main-nav" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              aria-current={currentPage === link.id ? 'page' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          {isAdmin && (
            <a className="admin-pill-link" href="/admin.html" aria-label="Abrir panel de administración">
              Admin
            </a>
          )}
          <AccountMenu />
          <button className="cart-trigger" type="button" onClick={onOpenCart} aria-label={'Abrir pedido, ' + itemCount + ' productos'}>
            <BagIcon />
            <span className="cart-trigger__label">Mi pedido</span>
            <span className="cart-trigger__count" aria-live="polite">{itemCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
