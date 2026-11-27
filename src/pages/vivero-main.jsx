import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import ViveroPage from './ViveroPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ViveroPage />
  </StrictMode>,
);
