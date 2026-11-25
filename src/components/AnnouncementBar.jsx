import { store } from '../config/store';

export default function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <span className="announcement-bar__dot" aria-hidden="true" />
      Cultivadas en {store.city} <span className="announcement-bar__separator">·</span> Fotos reales de nuestro vivero
    </div>
  );
}
