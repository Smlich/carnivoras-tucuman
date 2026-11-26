import { useEffect, useRef } from 'react';
import { formatPrice } from '../utils/format-price';

export default function CatalogLightbox({
  products,
  activeProduct,
  addedProductId,
  onClose,
  onSelectProduct,
  onAdd,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const activeIndex = activeProduct
    ? products.findIndex((product) => product.id === activeProduct.id)
    : -1;
  const canNavigate = products.length > 1 && activeIndex !== -1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!activeProduct) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
  }, [activeProduct]);

  function showProduct(offset) {
    if (!canNavigate) return;
    const nextIndex = (activeIndex + offset + products.length) % products.length;
    onSelectProduct(products[nextIndex].id);
  }

  function handleKeyDown(event) {
    if (!activeProduct) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showProduct(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showProduct(-1);
    }
  }

  return (
    <dialog
      className="gallery-viewer catalog-viewer"
      ref={dialogRef}
      aria-labelledby="catalog-viewer-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      {activeProduct && (
        <div className="gallery-viewer__content">
          <button
            className="gallery-viewer__close"
            type="button"
            aria-label="Cerrar foto ampliada"
            ref={closeButtonRef}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
            <span>Cerrar</span>
          </button>
          <div className="gallery-viewer__photo-row">
            {canNavigate ? (
              <button className="gallery-viewer__arrow" type="button" aria-label="Ver producto anterior" onClick={() => showProduct(-1)}>
                <span aria-hidden="true">←</span>
              </button>
            ) : <span aria-hidden="true" />}
            <img className="gallery-viewer__image" src={activeProduct.image} alt={activeProduct.imageAlt} />
            {canNavigate ? (
              <button className="gallery-viewer__arrow" type="button" aria-label="Ver producto siguiente" onClick={() => showProduct(1)}>
                <span aria-hidden="true">→</span>
              </button>
            ) : <span aria-hidden="true" />}
          </div>
          <div className="gallery-viewer__caption">
            <span>{activeProduct.categoryLabel} · {Math.max(activeIndex, 0) + 1} de {Math.max(products.length, 1)}</span>
            <h2 id="catalog-viewer-title">{activeProduct.name}</h2>
            <p className="catalog-viewer__species">{activeProduct.species}</p>
            <p>{activeProduct.description}</p>
            <p>{activeProduct.note}</p>
            <p className="catalog-viewer__quality">Foto original en máxima calidad</p>
            <div className="catalog-viewer__actions">
              <strong className="catalog-viewer__price">{formatPrice(activeProduct.price)}</strong>
              <button className="button button--dark" type="button" onClick={() => onAdd(activeProduct)}>
                <span aria-hidden="true">+</span> Agregar al pedido
              </button>
            </div>
            <p className="catalog-viewer__added" role="status" aria-live="polite">
              {addedProductId === activeProduct.id ? 'Agregado a tu pedido.' : ''}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
