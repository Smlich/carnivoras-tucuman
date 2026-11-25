import { store } from '../config/store';
import CatalogImage from './CatalogImage';

export default function SiteFooter() {
  const socialLinks = [
    { label: store.instagramHandle, href: store.instagramUrl },
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
          {socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>)}
        </div>
      </div>
      <section className="page-shell site-footer__seals" aria-label="Sellos de origen y autoría">
        <img className="site-footer__seal" src="/images/brand/hecho-en-argentina.svg" alt="Hecho en Argentina" width="270" height="102" loading="lazy" />
        <img className="site-footer__seal" src="/images/brand/codeado-en-argentina.svg" alt="Codeado en Argentina" width="270" height="102" loading="lazy" />
        <img className="site-footer__seal" src="/images/brand/smlich-soluciones.svg" alt="SMlich Soluciones IT" width="270" height="102" loading="lazy" />
      </section>
      <div className="page-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} {store.name}</span>
        <span>Fotos reales del catálogo del vivero.</span>
      </div>
    </footer>
  );
}
