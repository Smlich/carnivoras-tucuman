import { createContactUrl } from '../utils/whatsapp';

const careTips = [
  {
    number: '01',
    title: 'Agua de lluvia o destilada',
    tag: '< 50 PPM',
    description: 'Evitá agua de red o mineral: sus sales queman las raíces adaptadas a suelos de pantano.',
    symbol: '≈',
  },
  {
    number: '02',
    title: 'Luz intensa con aclimatación',
    tag: 'SOL GRADUAL',
    description: 'Venus, Drosera y Sarracenia aman la luz brillante; pasalas al sol poco a poco para evitar quemaduras.',
    symbol: '☼',
  },
  {
    number: '03',
    title: 'Sustrato inerte sin abono',
    tag: 'SIN FERTILIZANTE',
    description: 'Usá musgo sphagnum o turba rubia con perlita. Nunca tierra negra de jardín ni fertilizantes.',
    bloom: true,
  },
  {
    number: '04',
    title: 'Reposo invernal según especie',
    tag: 'CICLO NATURAL',
    description: 'Venus y Sarracenia descansan en invierno; Drosera capensis y Nepenthes siguen activas todo el año.',
    symbol: '☾',
  },
];

const mechanismPreviews = [
  {
    src: '/images/gallery/optimized/venus-trampa-macro-480w.jpg',
    alt: 'Trampa de Venus atrapamoscas con bordes dentados e interior rojizo.',
    label: 'Cepo · Venus',
    href: '/cuidados.html#mecanismos',
  },
  {
    src: '/images/gallery/optimized/drosera-tentaculos-macro-480w.jpg',
    alt: 'Hojas de Drosera cubiertas de gotas adhesivas brillantes.',
    label: 'Mucílago · Drosera',
    href: '/cuidados.html#mecanismos',
  },
  {
    src: '/images/gallery/optimized/sarracenia-trampas-tubulares-480w.jpg',
    alt: 'Trampas tubulares rojizas y verdes de Sarracenia en el vivero.',
    label: 'Jarro · Sarracenia',
    href: '/cuidados.html#mecanismos',
  },
];

export default function CareSection() {
  return (
    <section className="care-section section-pad" id="cuidados" aria-labelledby="care-title">
      <img className="botanical-ornament botanical-ornament--care" src="/images/botanical/hanging-pitcher-vine.svg" alt="" aria-hidden="true" />
      <img className="botanical-specimen botanical-specimen--care" src="/images/botanical/venus-trap-specimen.svg" alt="" aria-hidden="true" />

      <div className="page-shell care-section__inner">
        <div className="care-section__intro">
          <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> Laboratorio de cultivo</p>
          <h2 id="care-title">Entendé su biología y <em>crecerán increíbles.</em></h2>
          <p>
            Cada planta carnívora evolucionó en pantanos con muy pocos nutrientes. Preparamos una guía ilustrada con fotos reales, esquema de riego por bandeja y fichas por especie.
          </p>

          <div className="care-preview-strip">
            {mechanismPreviews.map((item) => (
              <a className="care-preview-thumb" key={item.src} href={item.href}>
                <img src={item.src} alt={item.alt} width="160" height="120" loading="lazy" />
                <span>{item.label}</span>
              </a>
            ))}
          </div>

          <div className="care-section__actions">
            <a className="button button--light" href="/cuidados.html">Abrir guía ilustrada y fichas <span aria-hidden="true">↗</span></a>
            <a className="button button--outline-light" href={createContactUrl()} target="_blank" rel="noopener noreferrer">Consultar un caso por WhatsApp <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div>
          <div className="care-list">
            {careTips.map((tip) => (
              <article className="care-tip" key={tip.number}>
                <span className="care-tip__number">{tip.number}</span>
                <div>
                  <div className="care-tip__head">
                    <h3>{tip.title}</h3>
                    <span className="care-tip__tag">{tip.tag}</span>
                  </div>
                  <p>{tip.description}</p>
                </div>
                {tip.bloom ? (
                  <span className="care-tip__symbol care-tip__symbol--bloom" aria-hidden="true">
                    <img src="/images/botanical/drosera-bloom.svg" alt="" width="28" height="28" />
                  </span>
                ) : (
                  <span className="care-tip__symbol" aria-hidden="true">{tip.symbol}</span>
                )}
              </article>
            ))}
          </div>

          <p className="care-sources">
            Fuentes botánicas enlazadas en la guía:{' '}
            <a href="https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Dionaea_muscipula.pdf" target="_blank" rel="noreferrer">Venus atrapamoscas</a>,{' '}
            <a href="https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Drosera_capensis.pdf" target="_blank" rel="noreferrer">Drosera capensis</a>,{' '}
            <a href="https://carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Sarracenia_purpurea.pdf" target="_blank" rel="noreferrer">Sarracenia</a> y{' '}
            <a href="https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants" target="_blank" rel="noreferrer">U.S. Botanic Garden</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
