import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import SpeciesLandingPage from './SpeciesLandingPage';

const slug = typeof document !== 'undefined' ? document.documentElement.dataset.species : '';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SpeciesLandingPage slug={slug} />
  </StrictMode>,
);
