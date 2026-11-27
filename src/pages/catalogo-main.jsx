import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import CatalogoPage from './CatalogoPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatalogoPage />
  </StrictMode>,
);
