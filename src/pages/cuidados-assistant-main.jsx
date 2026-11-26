import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CareDoctorAssistant from '../components/CareDoctorAssistant';

const rootElement = document.getElementById('care-doctor-root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <CareDoctorAssistant />
    </StrictMode>,
  );
}
