import { renderToString } from 'react-dom/server';
import App from '../App.jsx';
import CatalogoPage from '../pages/CatalogoPage.jsx';
import ContactoPage from '../pages/ContactoPage.jsx';
import JuegosPage from '../pages/JuegosPage.jsx';
import SpeciesLandingPage from '../pages/SpeciesLandingPage.jsx';
import ViveroPage from '../pages/ViveroPage.jsx';

export const PRERENDER_TARGETS = [
  'index.html',
  'catalogo.html',
  'vivero.html',
  'contacto.html',
  'juegos.html',
  'venus-atrapamoscas.html',
  'drosera.html',
  'sarracenia.html',
  'nepenthes.html',
  'pinguicula.html',
];

const PAGE_FACTORIES = {
  'index.html': () => <App />,
  'catalogo.html': () => <CatalogoPage />,
  'vivero.html': () => <ViveroPage />,
  'contacto.html': () => <ContactoPage />,
  'juegos.html': () => <JuegosPage />,
  'venus-atrapamoscas.html': () => <SpeciesLandingPage slug="venus-atrapamoscas" />,
  'drosera.html': () => <SpeciesLandingPage slug="drosera" />,
  'sarracenia.html': () => <SpeciesLandingPage slug="sarracenia" />,
  'nepenthes.html': () => <SpeciesLandingPage slug="nepenthes" />,
  'pinguicula.html': () => <SpeciesLandingPage slug="pinguicula" />,
};

/** Renderiza en servidor el HTML inicial de cada página React pública para SEO. */
export function renderPageHtml(fileName) {
  const factory = PAGE_FACTORIES[fileName];
  if (!factory) {
    throw new Error(`No hay plantilla prerenderizada configurada para "${fileName}".`);
  }
  return renderToString(factory());
}
