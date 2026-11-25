function getResponsiveSourceSet(src) {
  const match = /^\/images\/catalog\/([^/]+)\.(png|jpe?g)$/i.exec(src ?? '');
  if (!match) return null;

  const [, basename, extension] = match;
  const directory = '/images/catalog/optimized';

  if (basename.startsWith('logo-')) {
    return { type: 'image/webp', srcSet: `${directory}/${basename}.webp` };
  }

  const isJpeg = extension.toLowerCase() !== 'png';
  const type = isJpeg ? 'image/jpeg' : 'image/webp';
  const outputExtension = isJpeg ? 'jpg' : 'webp';
  return {
    type,
    srcSet: [480, 960].map((width) => `${directory}/${basename}-${width}w.${outputExtension} ${width}w`).join(', '),
  };
}

export default function CatalogImage({ src, alt, className, pictureClassName, sizes, ...imageProps }) {
  const optimized = getResponsiveSourceSet(src);

  return (
    <picture className={pictureClassName}>
      {optimized && <source type={optimized.type} srcSet={optimized.srcSet} sizes={sizes} />}
      <img src={src} alt={alt} className={className} {...imageProps} />
    </picture>
  );
}
