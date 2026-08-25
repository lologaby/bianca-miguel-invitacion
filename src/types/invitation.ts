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

export interface RecommendedLodging {
  name: string;
  note?: string;
  url?: string;
}

export interface EventTransportation {
  available: boolean;
  note: string;
}

export interface EventPlaylist {
  label: string;
  url: string;
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
  lodging?: RecommendedLodging[];
  transportation?: EventTransportation;
  hashtag?: string;
  playlist?: EventPlaylist;
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
 *
 * Deliberately omits lodging/transportation/hashtag/playlist, because the real
 * event does not set them either — GuestPlanning does not render in production.
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
    dateLabel: '00 de mes de 0000',
    dateShort: '00 · MES',
    start: '2027-01-01T16:00:00-04:00',
    end: '2027-01-02T02:00:00-04:00',
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
      moments: ['Cóctel de bienvenida', 'Cata de vino y chocolates', 'Cena y baile'],
    },
    dressCode: {
      label: 'Cóctel / Formal',
      note: 'Sin código de color: use el que prefiera.',
    },
    gifts: {
      heading: 'Un detalle',
      message: 'Su presencia es el regalo. Si desea obsequiarnos algo, puede hacerlo en efectivo o por ATH Móvil.',
      athMovil: '000-000-0000',
    },
    story: {
      paragraphs: [
        'Párrafo de demostración sobre el lugar elegido y lo que se vivirá allí antes de la cena.',
      ],
    },
    weatherNote: 'Nota de demostración sobre el clima al llegar y qué telas resultan más cómodas.',
    faq: [
      { id: 'companions', q: '¿Puedo llevar acompañantes?', a: 'Respuesta de demostración sobre las personas incluidas en la invitación.' },
      { id: 'attire-colors', q: '¿Hay colores reservados?', a: 'Respuesta de demostración sobre los colores y la luz del lugar.' },
      { id: 'indoor-spaces', q: '¿Todo será bajo techo?', a: 'Respuesta de demostración sobre los espacios interiores.' },
      { id: 'rsvp-deadline', q: '¿Hasta cuándo puedo confirmar?', a: 'Respuesta de demostración con la fecha límite.' },
      { id: 'parking', q: '¿Habrá estacionamiento?', a: 'Respuesta de demostración sobre el estacionamiento.' },
      { id: 'drinks', q: '¿Habrá bebidas sin alcohol?', a: 'Respuesta de demostración sobre la barra.' },
    ],
  },
};
