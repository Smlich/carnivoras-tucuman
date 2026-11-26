import { store } from '../config/store';

export default function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <span className="announcement-bar__dot" aria-hidden="true" />
      Vivero botánico · {store.city}
      <span className="announcement-bar__separator" aria-hidden="true">·</span>
      Fotos reales de nuestras plantas
      <span className="announcement-bar__separator" aria-hidden="true">·</span>
      Consultas directas por WhatsApp
    </div>
  );
}
