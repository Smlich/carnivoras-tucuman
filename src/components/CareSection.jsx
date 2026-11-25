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
            <div><h3>Agua adecuada</h3><p>Usá agua de lluvia o destilada. Evitá el agua de red y el agua mineral para reducir la acumulación de minerales.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">≈</span>
          </article>
          <article className="care-tip">
            <span className="care-tip__number">02</span>
            <div><h3>Luz con adaptación</h3><p>Venus, Drosera y Sarracenia necesitan mucha luz. Aclimatá cada planta de a poco al lugar donde va a vivir.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">☼</span>
          </article>
          <article className="care-tip">
            <span className="care-tip__number">03</span>
            <div><h3>Sustrato especializado</h3><p>No uses tierra de jardín ni fertilizante común. El sustrato debe ser pobre en nutrientes y adecuado para cada especie.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">✿</span>
          </article>
          <article className="care-tip">
            <span className="care-tip__number">04</span>
            <div><h3>Reposo por especie</h3><p>La necesidad de reposo depende de la especie y de cómo se cultiva. Consultanos antes de cambiar su rutina en invierno.</p></div>
            <span className="care-tip__symbol" aria-hidden="true">☾</span>
          </article>
        </div>
        <p className="care-sources">
          Guías consultadas: <a href="https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Dionaea_muscipula.pdf" target="_blank" rel="noreferrer">Venus atrapamoscas</a>,{' '}
          <a href="https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Drosera_capensis.pdf" target="_blank" rel="noreferrer">Drosera capensis</a>,{' '}
          <a href="https://carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Sarracenia_purpurea.pdf" target="_blank" rel="noreferrer">Sarracenia</a> y el{' '}
          <a href="https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants" target="_blank" rel="noreferrer">U.S. Botanic Garden</a>.
        </p>
      </div>
    </section>
  );
}
