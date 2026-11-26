import { store } from '../config/store';
import AccountMenu from './AccountMenu';
import CatalogImage from './CatalogImage';

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bag-icon">
      <path d="M5.5 8.5h13l1 12h-15l1-12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteHeader({ itemCount, onOpenCart }) {
  return (
    <header className="site-header">
      <div className="site-header__inner page-shell">
        <a className="brand" href="#inicio" aria-label={store.name + ' — inicio'}>
          <CatalogImage src="/images/catalog/logo-light.png" alt="" className="brand__logo" sizes="48px" />
          <span className="brand__text">
            <strong>Carnívoras</strong>
            <span>Tucumán</span>
          </span>
        </a>

        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#catalogo">Catálogo</a>
          <a href="#galeria">Vivero</a>
          <a href="/cuidados.html">Cuidados</a>
          <a href="#juegos">Juegos</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <div className="site-header__actions">
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
