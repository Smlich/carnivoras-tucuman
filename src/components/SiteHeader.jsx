import { useEffect, useRef, useState } from 'react';
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

function MenuIcon({ isOpen }) {
  if (isOpen) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-toggle__icon">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-toggle__icon">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteHeader({ currentPage = 'inicio', itemCount, onOpenCart }) {
  const { isAdmin } = useAuth();
  const { settings } = useSiteContent();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 861px)');
    function handleBreakpointChange(event) {
      if (event.matches) setIsMenuOpen(false);
    }
    mediaQuery.addEventListener('change', handleBreakpointChange);
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    }

    function handlePointerDown(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner page-shell">
        <a className="brand" href="/" aria-label={settings.storeName + ' — inicio'}>
          <CatalogImage src="/images/catalog/logo-light.png" alt="" className="brand__logo" sizes="48px" />
          <span className="brand__text">
            {settings.storeName === 'Carnívoras Tucumán' ? (
              <>
                <strong>Carnívoras</strong>
                <span>Tucumán</span>
              </>
            ) : (
              <>
                <strong>{settings.storeName}</strong>
                <span>{settings.city}</span>
              </>
            )}
          </span>
        </a>

        <nav
          id="main-nav-menu"
          className={'main-nav' + (isMenuOpen ? ' is-open' : '')}
          aria-label="Navegación principal"
        >
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              aria-current={currentPage === link.id ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {isAdmin && (
            <a
              className="main-nav__admin-mobile"
              href="/admin.html"
              onClick={() => setIsMenuOpen(false)}
            >
              Panel Admin
            </a>
          )}
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
          <button
            ref={toggleButtonRef}
            className="nav-toggle"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="main-nav-menu"
            aria-label={isMenuOpen ? 'Cerrar menú de secciones' : 'Abrir menú de secciones'}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MenuIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </div>
    </header>
  );
}
