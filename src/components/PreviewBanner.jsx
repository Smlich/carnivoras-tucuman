import { useSiteContent } from '../context/SiteContentContext';

export default function PreviewBanner() {
  const { settings } = useSiteContent();
  const shouldShow = import.meta.env.VITE_STATIC_PREVIEW === 'true' || Boolean(settings.showPreviewBanner);
  if (!shouldShow) return null;

  return (
    <aside className="preview-banner" role="note">
      {settings.previewBannerText}
    </aside>
  );
}
