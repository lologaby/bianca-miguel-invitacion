export interface Guest {
  name: string;
  partyLimit: number;
  plusOneAllowed: boolean;
  companionNames?: string[];
}

export interface PrivateEvent {
  couple: { first: string; second: string };
  dateLabel: string;
  dateShort: string;
  start: string;
  end: string;
  timezone: string;
  timeLabel: string;
  ceremony: { name: string; city: string; mapsUrl: string };
  reception: { name: string; note: string; mapsUrl?: string };
}

export interface InvitationPayload {
  guest: Guest;
  event: PrivateEvent;
}

export const localDemoInvitation: InvitationPayload = {
  guest: {
    name: 'Andrea Rivera',
    partyLimit: 2,
    plusOneAllowed: true,
    companionNames: ['Acompañante invitado'],
  },
  event: {
    couple: { first: 'Amelia', second: 'Mateo' },
    dateLabel: 'Fecha de demostración',
    dateShort: 'FECHA · DEMO',
    start: '2027-01-01T17:00:00-04:00',
    end: '2027-01-02T02:00:00-04:00',
    timezone: 'UTC',
    timeLabel: 'Hora por confirmar',
    ceremony: {
      name: 'Lugar de ceremonia',
      city: 'Ciudad de demostración',
      mapsUrl: '#',
    },
    reception: {
      name: 'Lugar de recepción',
      note: 'Los detalles finales se compartirán con cada invitación.',
    },
  },
};
