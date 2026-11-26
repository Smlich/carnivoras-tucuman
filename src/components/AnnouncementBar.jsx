import { Fragment } from 'react';
import { useSiteContent } from '../context/SiteContentContext';

export default function AnnouncementBar() {
  const { settings } = useSiteContent();
  const items = Array.isArray(settings.announcementItems) && settings.announcementItems.length > 0
    ? settings.announcementItems
    : ['Vivero botánico · ' + settings.city, 'Fotos reales de nuestras plantas', 'Consultas directas por WhatsApp'];

  return (
    <div className="announcement-bar">
      <span className="announcement-bar__dot" aria-hidden="true" />
      {items.map((text, index) => (
        <Fragment key={text + '-' + index}>
          {index > 0 && <span className="announcement-bar__separator" aria-hidden="true">·</span>}
          <span>{text}</span>
        </Fragment>
      ))}
    </div>
  );
}
