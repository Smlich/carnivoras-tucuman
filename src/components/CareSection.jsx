export default function CareSection() {
  return (
    <section className="care-section section-pad" id="cuidados" aria-labelledby="care-title">
      <div className="page-shell care-section__inner">
        <div className="care-section__intro">
          <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> Un buen comienzo</p>
          <h2 id="care-title">Cuidarlas también es parte de <em>la aventura.</em></h2>
          <p>Las plantas carnívoras tienen necesidades especiales. Cada especie es distinta: consultanos cuál se adapta mejor a tu espacio.</p>
          <a className="button button--light" href="#contacto">Preguntanos por WhatsApp <span aria-hidden="true">↗</span></a>
        </div>

        <div className="care-list">
          <article className="care-tip">
            <span className="care-tip__number">01</span>
            <div><h3>Agua adecuada</h3><p>Muchas especies prefieren agua de lluvia o baja en minerales. Evitá cambiar el tipo de agua sin revisar la guía de esa especie.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">≈</span>
          </article>
          <article className="care-tip">
            <span className="care-tip__number">02</span>
            <div><h3>Luz con adaptación</h3><p>La luz es importante; acostumbrá la planta gradualmente a las condiciones nuevas de tu hogar.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">☼</span>
          </article>
          <article className="care-tip">
            <span className="care-tip__number">03</span>
            <div><h3>Sustrato especializado</h3><p>Usá mezclas adecuadas para cada especie y no agregues fertilizante común sin asesoramiento.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">✿</span>
          </article>
        </div>
      </div>
    </section>
  );
}
