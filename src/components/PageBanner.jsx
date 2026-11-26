export default function PageBanner({ currentLabel, eyebrow, title, lead }) {
  return (
    <section className="page-banner hero-stage">
      <img className="botanical-ornament botanical-ornament--banner" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
      <div className="page-shell page-banner__inner">
        <nav className="page-breadcrumb" aria-label="Ruta de navegación">
          <a href="/">Inicio</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{currentLabel}</span>
        </nav>
        <p className="eyebrow eyebrow--light">
          <span className="eyebrow__line" /> {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="page-banner__lead">{lead}</p>
      </div>
    </section>
  );
}
