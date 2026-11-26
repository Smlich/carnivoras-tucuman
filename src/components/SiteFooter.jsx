import { useSiteContent } from '../context/SiteContentContext';
import CatalogImage from './CatalogImage';

const footerPages = [
  { label: 'Inicio', href: '/' },
  { label: 'Catálogo', href: '/catalogo.html' },
  { label: 'Álbum del vivero', href: '/vivero.html' },
  { label: 'Guía de cuidados', href: '/cuidados.html' },
  { label: 'Juegos gratis', href: '/juegos.html' },
  { label: 'Contacto', href: '/contacto.html' },
  { label: 'Admin', href: '/admin.html' },
];

export default function SiteFooter() {
  const { settings } = useSiteContent();

  const socialLinks = [
    { label: settings.instagramHandle, href: settings.instagramUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((item) => item.href);

  return (
    <footer className="site-footer">
      <div className="page-shell site-footer__main">
        <a className="footer-brand" href="/" aria-label={settings.storeName + ' — volver al inicio'}>
          <CatalogImage src="/images/catalog/logo-dark.png" alt="" className="footer-brand__logo" sizes="49px" />
          <span><strong>Carnívoras</strong><small>Tucumán · Argentina</small></span>
        </a>
        <p className="site-footer__line">Un rincón extraordinario de la naturaleza, cultivado con paciencia.</p>
        <div className="site-footer__links">
          {footerPages.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          {socialLinks.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
          ))}
        </div>
      </div>
      <section className="page-shell site-footer__marks" aria-label="Origen y desarrollo">
        <figure className="site-footer__mark">
          <img src="/images/brand/hecho-en-argentina.svg" alt="" width="52" height="52" loading="lazy" />
          <figcaption><span>Hecho en</span><strong>Argentina</strong></figcaption>
        </figure>
        <figure className="site-footer__mark">
          <img src="/images/brand/codeado-en-argentina.svg" alt="" width="52" height="52" loading="lazy" />
          <figcaption><span>Codeado en</span><strong>Argentina</strong></figcaption>
        </figure>
        <figure className="site-footer__mark site-footer__mark--smlich">
          <img src="/images/brand/smlich-soluciones.svg" alt="" width="52" height="52" loading="lazy" />
          <figcaption><span>Desarrollo web</span><strong>SMlich Soluciones IT</strong></figcaption>
        </figure>
      </section>
      <div className="page-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} {settings.storeName}</span>
        <span>Fotografías originales de nuestro vivero.</span>
        <div className="visit-counter" data-visit-counter data-visit-endpoint="/api/visits" aria-live="polite" aria-atomic="true">
          <span className="visit-counter__plant" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M15.8 27c1.2-7.7 1-14.8-.2-21.5M15.7 20c-4.6-4.2-8.5-5.3-12.1-4.9 1.3 5.2 5.1 8.2 11.8 8.7M15.7 15.7c3.8-5.2 7.7-7.5 12.1-7.7-1 5.7-4.7 9.2-11.6 11.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              <circle cx="4.1" cy="15.1" r="1.8" fill="currentColor" />
              <circle cx="27.8" cy="7.8" r="1.8" fill="currentColor" />
              <circle cx="15.6" cy="5.1" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="visit-counter__label">Visitas del vivero</span>
          <strong className="visit-counter__value" data-visit-count>—</strong>
          <span className="visit-counter__caption" data-visit-caption>conectando el contador</span>
        </div>
      </div>
    </footer>
  );
}
