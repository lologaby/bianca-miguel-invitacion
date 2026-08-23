import type { PrivateEvent } from '../types/invitation';

const genericFaq: NonNullable<PrivateEvent['faq']> = [
  { id: 'companions', q: '¿Puedo llevar acompañantes?', a: 'La cantidad de personas incluidas aparece dentro de cada invitación personalizada.' },
  { id: 'attire', q: '¿Hay indicaciones para la vestimenta?', a: 'Las indicaciones de vestimenta aparecerán dentro de la invitación.' },
  { id: 'spaces', q: '¿Cómo serán los espacios de la celebración?', a: 'Los detalles de los espacios se compartirán dentro de la invitación.' },
  { id: 'deadline', q: '¿Hasta cuándo puedo confirmar mi asistencia?', a: 'La fecha límite de confirmación aparecerá dentro de la invitación.' },
  { id: 'parking', q: '¿Habrá estacionamiento disponible?', a: 'Las indicaciones de estacionamiento se compartirán con los detalles de la celebración.' },
  { id: 'drinks', q: '¿Habrá opciones de bebidas?', a: 'Las opciones disponibles se detallarán dentro de la invitación.' },
];

export function faqFor(event: PrivateEvent) {
  return event.faq?.length ? event.faq : genericFaq;
}
