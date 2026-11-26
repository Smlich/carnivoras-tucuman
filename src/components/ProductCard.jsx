import { formatPrice } from '../utils/format-price';
import CatalogImage from './CatalogImage';

export default function ProductCard({ product, onAdd, onInspect }) {
  const isOutOfStock = product.stockStatus === 'unavailable';

  return (
    <article className={'product-card' + (isOutOfStock ? ' is-unavailable' : '')} data-category={product.category}>
      <div className="product-card__image-wrap">
        <button
          className="product-card__image-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-label={'Ampliar foto de ' + product.name + ' en máxima calidad'}
          onClick={() => onInspect(product)}
        >
          <CatalogImage
            className="product-card__image"
            src={product.image}
            alt={product.imageAlt}
            pictureClassName="product-card__picture"
            sizes="(max-width: 640px) 46vw, (max-width: 1080px) 30vw, 24vw"
            loading="lazy"
            decoding="async"
          />
          <span className="product-card__zoom" aria-hidden="true">Ampliar ↗</span>
        </button>
        <span className="product-card__badge">{product.categoryLabel}</span>
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <p className="product-card__species">{product.species}</p>
        </div>
        <h3>{product.name}</h3>
        <p className="product-card__description">{product.description}</p>
        <p className="product-card__note">
          {isOutOfStock ? 'Sin stock momentáneo · Consultá próxima fecha' : product.note}
        </p>
        <div className="product-card__footer">
          <strong className="product-card__price">{formatPrice(product.price)}</strong>
          <button
            className="add-button"
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAdd(product)}
            aria-label={isOutOfStock ? product.name + ' sin stock por ahora' : 'Agregar ' + product.name + ' al pedido'}
          >
            {isOutOfStock ? 'Sin stock' : (<><span aria-hidden="true">+</span> Agregar</>)}
          </button>
        </div>
      </div>
    </article>
  );
}
