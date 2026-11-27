import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import JuegosPage from './JuegosPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <JuegosPage />
  </StrictMode>,
);
