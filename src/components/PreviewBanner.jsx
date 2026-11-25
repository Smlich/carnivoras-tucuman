export default function PreviewBanner() {
  if (import.meta.env.VITE_STATIC_PREVIEW !== 'true') return null;

  return (
    <aside className="preview-banner" role="note">
      Vista de prueba · Confirmá precio, stock y entrega por WhatsApp antes de hacer un pedido.
    </aside>
  );
}
