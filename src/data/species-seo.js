function normalizeTerm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const SPECIES_SEO_PAGES = [
  {
    slug: 'venus-atrapamoscas',
    shortName: 'Venus atrapamoscas',
    scientificName: 'Dionaea muscipula',
    h1Prefix: 'Venus atrapamoscas en',
    h1Emphasis: 'Tucumán.',
    metaTitle: 'Venus atrapamoscas en Tucumán | Carnívoras Tucumán',
    metaDescription: 'Venus atrapamoscas (Dionaea muscipula) cultivadas en Tucumán. Precios congelados, fotos reales, cuidados para el clima local y consulta por WhatsApp.',
    lead: 'Ejemplares clásicos y cultivares de Dionaea muscipula aclimatados al sol y al invierno de Tucumán, con fotos reales y asesoramiento por WhatsApp.',
    ogImage: '/images/og/og-catalogo.jpg',
    heroImage: '/images/gallery/venus-atrapamoscas-captura.jpeg',
    heroImageAlt: 'Venus atrapamoscas cultivada en Carnívoras Tucumán con varias trampas abiertas.',
    matchTerms: ['venus', 'dionaea'],
    careItems: [
      {
        label: 'Luz y sol',
        value: '4 a 6 horas de sol directo por día. En el verano tucumano, evitá el sol fuerte de 12 a 16 h.',
      },
      {
        label: 'Agua y riego',
        value: 'Siempre agua destilada, desmineralizada o de lluvia en bandeja baja de 1 a 2 cm.',
      },
      {
        label: 'Sustrato',
        value: 'Mezcla ácida e inerte (musgo sphagnum o turba rubia + perlita), nunca tierra común.',
      },
      {
        label: 'Estacionalidad',
        value: 'Hace reposo invernal natural cuando baja la temperatura y rebrota con fuerza en primavera.',
      },
    ],
    faqs: [
      {
        question: '¿Cómo cuido una Venus atrapamoscas con el calor de Tucumán?',
        answer: 'Dales buen sol de mañana o tarde (4 a 6 horas) y media sombra ligera entre las 12 y las 16 h en días de más de 35 °C para que no se caliente el agua de la bandeja.',
      },
      {
        question: '¿Se puede regar una Dionaea muscipula con agua de la canilla?',
        answer: 'No. El agua de red en Tucumán contiene sales y minerales que queman sus raíces. Usá siempre agua destilada, desmineralizada, de lluvia o de aire acondicionado.',
      },
      {
        question: '¿Hay que darle moscas o carne a mano?',
        answer: 'No. No les des carne ni las hagas cerrar por diversión porque cada trampa tiene cierres limitados. Si reciben luz exterior, cazan insectos solas.',
      },
      {
        question: '¿Cómo pido una Venus atrapamoscas en Carnívoras Tucumán?',
        answer: 'Agregá el tamaño o cultivar que te interese al carrito y enviá tu consulta por WhatsApp para coordinar entrega o retiro en San Miguel de Tucumán.',
      },
    ],
  },
  {
    slug: 'drosera',
    shortName: 'Drosera capensis',
    scientificName: 'Drosera capensis · Rocío del sol',
    h1Prefix: 'Drosera capensis en',
    h1Emphasis: 'Tucumán.',
    metaTitle: 'Drosera capensis en Tucumán | Carnívoras Tucumán',
    metaDescription: 'Drosera capensis en Tucumán: plantas carnívoras con gotitas de rocío ideales para principiantes. Mirá precios, promociones, cuidados y fotos reales.',
    lead: 'Una de las especies carnívoras más generosas y resistentes para empezar: sus tentáculos llenos de mucílago brillan al sol y atrapan mosquitos al instante.',
    ogImage: '/images/og/og-vivero.jpg',
    heroImage: '/images/gallery/drosera-tentaculos-macro.jpeg',
    heroImageAlt: 'Primer plano de hojas de Drosera capensis con gotitas de rocío en Carnívoras Tucumán.',
    matchTerms: ['drosera'],
    careItems: [
      {
        label: 'Luz y sol',
        value: 'Muy luminosa con 3 a 5 horas de sol suave; si pierde gotitas suele faltarle luz o humedad.',
      },
      {
        label: 'Agua y riego',
        value: 'Bandeja permanente con agua destilada o de lluvia. No mojes directamente las hojas con gotas.',
      },
      {
        label: 'Sustrato',
        value: 'Turba rubia o musgo sphagnum aireado con perlita, libre de fertilizantes y sales.',
      },
      {
        label: 'Ventaja local',
        value: 'Se adapta muy bien a balcones, patios luminosos y al clima templado-cálido de Tucumán.',
      },
    ],
    faqs: [
      {
        question: '¿Por qué la Drosera es ideal como primera planta carnívora?',
        answer: 'Drosera capensis crece rápido, florece seguido, tolera pequeños errores mejor que otras especies y produce mucílago visible todo el año.',
      },
      {
        question: '¿Qué hago si mi Drosera capensis perdió las gotitas?',
        answer: 'Ubicála con más luz natural (sin sol abrasador de siesta) y asegurate de que tenga bandeja con agua destilada o de lluvia constante.',
      },
      {
        question: '¿Sirve para controlar mosquitas de la fruta o del sustrato?',
        answer: 'Sí, sus tentáculos adhesivos atrapan mosquitas pequeñas de manera constante sin necesidad de químicos.',
      },
      {
        question: '¿Tienen combos o promos de Drosera en Tucumán?',
        answer: 'Sí, podés llevarla por unidad, en promo de 2 unidades o dentro del Combo inicial junto a Venus y Sarracenia.',
      },
    ],
  },
  {
    slug: 'sarracenia',
    shortName: 'Sarracenia',
    scientificName: 'Sarracenia · Plantas trompeta',
    h1Prefix: 'Sarracenia (trampas en tubo) en',
    h1Emphasis: 'Tucumán.',
    metaTitle: 'Sarracenia en Tucumán | Carnívoras Tucumán',
    metaDescription: 'Sarracenia en Tucumán: plantas carnívoras con trampas tubulares resistentes al exterior. Conocé tamaños disponibles, cuidados y consultas por WhatsApp.',
    lead: 'Carnívoras norteamericanas de jarros verticales estriados que aman el sol y resisten muy bien el cultivo al aire libre durante todo el año.',
    ogImage: '/images/og/og-catalogo.jpg',
    heroImage: '/images/gallery/sarracenia-trampas-tubulares.jpeg',
    heroImageAlt: 'Trampas tubulares de Sarracenia fotografiadas en el vivero Carnívoras Tucumán.',
    matchTerms: ['sarracenia'],
    careItems: [
      {
        label: 'Luz y sol',
        value: 'Ama el sol directo abundante (5+ horas) para tomar colores rojizos y jarros firmes.',
      },
      {
        label: 'Agua y riego',
        value: 'Bandeja siempre húmeda con agua de lluvia o destilada; en verano consumen bastante agua.',
      },
      {
        label: 'Sustrato',
        value: 'Sustrato ácido inerte de turba rubia/sphagnum con perlita o arena de cuarzo lavada.',
      },
      {
        label: 'Estacionalidad',
        value: 'Exterior todo el año: en invierno seca jarros viejos para rebrotar vigorosa en primavera.',
      },
    ],
    faqs: [
      {
        question: '¿La Sarracenia soporta estar afuera en el patio o balcón en Tucumán?',
        answer: 'Sí, es de las carnívoras más rústicas para exterior. Solo conviene filtrar el sol más fuerte si es un ejemplar chico en días extremos de verano.',
      },
      {
        question: '¿Hay que llenar de agua los tubos de la Sarracenia?',
        answer: 'En la mayoría de las Sarracenias no hace falta llenar los jarros; la humedad sube desde la bandeja de riego.',
      },
      {
        question: '¿Es normal que se sequen los jarros en invierno?',
        answer: 'Sí, entran en dormancia invernal. Podás los tubos secos al ras sin dañar el rizoma y en primavera vuelve a brotar con fuerza.',
      },
      {
        question: '¿Incluyen Sarracenia en el Combo inicial?',
        answer: 'Sí, la Sarracenia pequeña forma parte tanto del catálogo individual como del Combo inicial de 3 carnívoras.',
      },
    ],
  },
  {
    slug: 'nepenthes',
    shortName: 'Nepenthes',
    scientificName: 'Nepenthes · Plantas tropicales de jarro',
    h1Prefix: 'Nepenthes (plantas de jarro) en',
    h1Emphasis: 'Tucumán.',
    metaTitle: 'Nepenthes en Tucumán | Carnívoras Tucumán',
    metaDescription: 'Guía y disponibilidad de Nepenthes en Tucumán: plantas carnívoras tropicales de jarro colgante ideales para galería o interior luminoso.',
    lead: 'Carnívoras tropicales con trampas en forma de jarro colgante pensadas para galerías luminosas, pérgolas o interiores muy iluminados sin sol fuerte.',
    ogImage: '/images/og/og-home.jpg',
    heroImage: '/images/gallery/trampa-tubular-roja.jpeg',
    heroImageAlt: 'Jarro rojizo de Nepenthes Bloody Mary fotografiado en Carnívoras Tucumán.',
    matchTerms: ['nepenthes'],
    careItems: [
      {
        label: 'Luz y sol',
        value: 'Luz brillante indirecta o sol muy filtrado de primera hora; el sol directo quema sus hojas.',
      },
      {
        label: 'Agua y riego',
        value: 'Riego superior frecuente con agua destilada o de lluvia, evitando dejar la maceta encharcada.',
      },
      {
        label: 'Sustrato',
        value: 'Mezcla muy aireada de musgo sphagnum largo, corteza de pino y perlita o leca.',
      },
      {
        label: 'Lugar ideal',
        value: 'Excelente para galerías luminosas, balcones protegidos o ventanas bien iluminadas.',
      },
    ],
    faqs: [
      {
        question: '¿La Nepenthes usa bandeja de agua constante como la Venus?',
        answer: 'No. A diferencia de Venus o Drosera, la Nepenthes prefiere riego superior dejando escurrir el exceso para evitar pudrición de raíces.',
      },
      {
        question: '¿Por qué mi Nepenthes no produce jarros nuevos?',
        answer: 'Casi siempre se debe a falta de luz brillante indirecta o aire demasiado seco; movela a un sitio muy luminoso sin sol fuerte y rocía alrededor.',
      },
      {
        question: '¿Debo cortar las hojas o jarros que se ponen marrones?',
        answer: 'Podés recortar únicamente el jarro cuando se seca por completo sin dañar la hoja verde mientras siga sana.',
      },
      {
        question: '¿Cómo consulto si hay Nepenthes en stock en Carnívoras Tucumán?',
        answer: 'Cuando tenemos camadas listas aparecen en esta ficha y en /catalogo.html; si no ves ejemplares publicados hoy, escribinos por WhatsApp para anotarte en la próxima tanda.',
      },
    ],
  },
  {
    slug: 'pinguicula',
    shortName: 'Pinguicula',
    scientificName: 'Pinguicula · Violetas carnívoras',
    h1Prefix: 'Pinguicula en',
    h1Emphasis: 'Tucumán.',
    metaTitle: 'Pinguicula en Tucumán | Carnívoras Tucumán',
    metaDescription: 'Guía y consultas de Pinguicula en Tucumán: carnívoras compactas de hojas pegajosas y floración llamativa para interiores muy iluminados.',
    lead: 'Rosetas compactas y decorativas que atrapan mosquitas en la superficie aterciopelada de sus hojas y regalan flores delicadas en tonos lilas y blancos.',
    ogImage: '/images/og/og-vivero.jpg',
    heroImage: '/images/gallery/flor-carnivora-vivero.jpeg',
    heroImageAlt: 'Flor lila de Pinguicula cultivada en el vivero Carnívoras Tucumán.',
    matchTerms: ['pinguicula'],
    careItems: [
      {
        label: 'Luz y sol',
        value: 'Mucha claridad indirecta o sol muy suave de la mañana; evitá el sol fuerte directo.',
      },
      {
        label: 'Agua y riego',
        value: 'Agua destilada o de lluvia en riegos moderados; tolera menos encharcamiento en invierno.',
      },
      {
        label: 'Sustrato',
        value: 'Sustrato mineral muy aireado (perlita, vermiculita/pumita y poca turba) con excelente drenaje.',
      },
      {
        label: 'Atractivo extra',
        value: 'Florece con varas altas y hojas suculentas sin necesidad de macetas grandes.',
      },
    ],
    faqs: [
      {
        question: '¿Puedo tener una Pinguicula cerca de una ventana luminosa?',
        answer: 'Sí, es una de las mejores carnívoras para interior muy iluminado o galería techada sin sol fuerte directo.',
      },
      {
        question: '¿Cómo riegan las Pinguiculas en verano vs invierno?',
        answer: 'En temporada cálida mantené el sustrato levemente húmedo; si entra en roseta suculenta invernal, espaciá mucho los riegos.',
      },
      {
        question: '¿Qué presas atrapan las Pinguiculas?',
        answer: 'Son expertas atrapando mosquitas pequeñas y jejenes gracias a sus hojas cubiertas de microglándulas adhesivas.',
      },
      {
        question: '¿Cuándo ingresan Pinguiculas al catálogo de Carnívoras Tucumán?',
        answer: 'Trabajamos por camadas estacionales del vivero; si hoy no figuran en stock podés consultarnos por WhatsApp cuándo sale la próxima tanda.',
      },
    ],
  },
];

export function getSpeciesBySlug(slug) {
  return SPECIES_SEO_PAGES.find((entry) => entry.slug === slug) ?? SPECIES_SEO_PAGES[0];
}

export function matchProductsForSpecies(products, species) {
  const terms = (species?.matchTerms || []).map(normalizeTerm).filter(Boolean);
  if (terms.length === 0) return [];
  return (products || []).filter((product) => {
    const haystack = normalizeTerm([product.id, product.name, product.species, product.categoryLabel, product.category].join(' '));
    return terms.some((term) => haystack.includes(term));
  });
}
