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

export const localDemoInvitation: InvitationPayload = {
  guest: {
    name: 'María Rodríguez',
    partyLimit: 2,
    plusOneAllowed: true,
    companionNames: ['Acompañante invitado'],
  },
  event: {
    couple: { first: 'Nombre', second: 'Nombre' },
    dateLabel: 'Fecha de demostración',
    dateShort: 'FECHA · DEMO',
    start: '2027-01-01T16:00:00-04:00',
    end: '2027-01-02T02:00:00-04:00',
    timezone: 'UTC',
    timeLabel: '4:00 p. m.',
    ceremony: {
      name: 'Lugar de ceremonia',
      city: 'Ciudad de demostración',
      mapsUrl: '#',
      timeLabel: '4:00 p. m.',
    },
    reception: {
      name: 'Lugar de recepción',
      note: 'Ciudad de demostración',
      city: 'Ciudad de demostración',
      timeLabel: '6:00 p. m.',
      moments: ['Cóctel de bienvenida', 'Cata de vino y chocolates', 'Cena y compartir'],
    },
    dressCode: {
      label: 'Cóctel / Formal',
      note: 'No hay colores reservados. Puede elegir el color que prefiera dentro del código Cóctel / Formal.',
    },
  },
};
