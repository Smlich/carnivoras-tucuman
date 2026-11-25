import { store } from '../config/store';
import CatalogImage from './CatalogImage';

export default function SiteFooter() {
  const socialLinks = [
    { label: 'Instagram', href: store.instagramUrl },
    { label: 'Facebook', href: store.facebookUrl },
  ].filter((item) => item.href);

  return (
    <footer className="site-footer">
      <div className="page-shell site-footer__main">
        <a className="footer-brand" href="#inicio" aria-label={store.name + ' — volver al inicio'}>
          <CatalogImage src="/images/catalog/logo-dark.png" alt="" className="footer-brand__logo" sizes="49px" />
          <span><strong>Carnívoras</strong><small>Tucumán · Argentina</small></span>
        </a>
        <p className="site-footer__line">Un rincón extraordinario de la naturaleza, cultivado con paciencia.</p>
        <div className="site-footer__links">
          <a href="#catalogo">Catálogo</a>
          <a href="/cuidados.html">Cuidados</a>
          <a href="#contacto">Contacto</a>
          {socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>)}
        </div>
      </div>
      <div className="page-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} {store.name}</span>
        <span>Fotos reales del catálogo del vivero.</span>
      </div>
    </footer>
  );
}
