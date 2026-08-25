export interface Guest {
  name: string;
  partyLimit: number;
  plusOneAllowed: boolean;
  companionNames?: string[];
}

export interface EventFaqItem {
  id: string;
  q: string;
  a: string;
}

export interface EventStory {
  kicker?: string;
  paragraphs: string[];
}

export interface PrivateEvent {
  couple: { first: string; second: string };
  dateLabel: string;
  dateShort: string;
  start: string;
  end: string;
  timezone: string;
  timeLabel: string;
  ceremony: { name: string; city: string; mapsUrl: string; timeLabel?: string };
  reception: {
    name: string;
    note: string;
    mapsUrl?: string;
    city?: string;
    timeLabel?: string;
    moments?: string[];
  };
  dressCode?: { label: string; note: string };
  gifts?: { heading?: string; message: string; athMovil: string };
  faq?: EventFaqItem[];
  story?: EventStory;
  weatherNote?: string;
}

export interface InvitationPayload {
  guest: Guest;
  event: PrivateEvent;
}

/**
 * The invitation the local QA path (`?qa=content`) renders.
 *
 * This module is imported by the gate, so it is bundled into the PUBLIC client
 * JavaScript — everything here is readable by anyone who loads the site without
 * ever entering a code. The venue, the date, the guest list and the couple's ATH
 * Móvil number are exactly what the gate exists to protect, so none of them may
 * appear here. Those live only in worker/index-miguel.ts, which runs on the
 * server and answers only authenticated guests.
 *
 * What must match the worker is the SHAPE — every field the real event sets,
 * set here too. When it drifts, sections silently stop rendering locally and
 * changes get reviewed against a page the guests never see.
 *
 * The couple's first names are the one real detail kept, because the gate shows
 * "B & M" publicly already and reviewing the lockup needs them.
 */
export const localDemoInvitation: InvitationPayload = {
  guest: {
    name: 'Invitada de prueba',
    partyLimit: 2,
    plusOneAllowed: true,
    companionNames: ['Acompañante de prueba'],
  },
  event: {
    couple: { first: 'Bianca', second: 'Miguel' },
    dateLabel: '26 de diciembre de 2026',
    dateShort: '26 · DICIEMBRE',
    start: '2026-12-26T16:00:00-04:00',
    end: '2026-12-27T02:00:00-04:00',
    timezone: 'America/Puerto_Rico',
    timeLabel: '4:00 p. m.',
    ceremony: {
      name: 'Lugar de ceremonia',
      city: 'Ciudad, Puerto Rico',
      timeLabel: '4:00 p. m.',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Puerto+Rico',
    },
    reception: {
      name: 'Lugar de recepción',
      note: 'Ciudad, Puerto Rico',
      city: 'Ciudad, Puerto Rico',
      timeLabel: '6:00 p. m.',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Puerto+Rico',
      moments: ['Cóctel de bienvenida', 'Vino y chocolate', 'Cena y baile'],
    },
    dressCode: {
      label: 'Cóctel / Formal',
      note: 'Sin código de color. La bodega tiene luz tenue y una atmósfera cálida; tome el ambiente como inspiración.',
    },
    gifts: {
      heading: 'Un detalle',
      message: 'Su presencia es el regalo. Si desea obsequiarnos algo, puede hacerlo en efectivo o por ATH Móvil.',
      athMovil: '000-000-0000',
    },
    story: {
      paragraphs: [
        'Elegimos Ponce, y una bodega de vinos para recibirle. Allí habrá una cata de vino y chocolate antes de la cena.',
      ],
    },
    weatherNote: 'Diciembre en Ponce sigue cálido. Todo será en interiores, con aire acondicionado — las telas frescas se agradecen.',
    faq: [
      { id: 'companions', q: '¿Puedo llevar acompañantes?', a: 'La invitación indica la cantidad de personas de su núcleo familiar que están incluidas. Por la planificación y la capacidad de la celebración, agradecemos que la asistencia se limite a ese número.' },
      { id: 'attire-colors', q: '¿Hay colores específicos para la vestimenta?', a: 'No tenemos un código de color. La recepción será en una bodega de vinos, de atmósfera cálida, íntima y de luz tenue; puede tomar ese ambiente como inspiración y usar su creatividad al elegir.' },
      { id: 'indoor-spaces', q: '¿La ceremonia y la recepción serán bajo techo?', a: 'Sí. Ambas se llevarán a cabo en espacios cerrados y con aire acondicionado, para su comodidad durante toda la celebración.' },
      { id: 'rsvp-deadline', q: '¿Hasta cuándo tengo para confirmar?', a: 'Agradecemos confirmar no más tarde del 15 de octubre de 2026. Eso nos permite cerrar a tiempo los detalles finales.' },
      { id: 'parking', q: '¿Habrá estacionamiento?', a: 'Para la ceremonia habrá estacionamiento en los predios de la iglesia. En la recepción los espacios de la bodega son limitados, aunque hay sitio en las calles y áreas cercanas; le recomendamos llegar con tiempo.' },
      { id: 'drinks', q: '¿Habrá bebidas sin alcohol?', a: 'Sí. Como parte de la recepción habrá una experiencia especial que incluye bebidas alcohólicas, y servicio de cash bar para quien desee más. También habrá opciones sin alcohol.' },
    ],
  },
};
