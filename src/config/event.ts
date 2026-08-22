import type { PrivateEvent } from '../types/invitation';

export function faqFor(event: PrivateEvent) {
  const dressCode = event.dressCode?.label ?? 'Cóctel / Formal';
  const dressNote = event.dressCode?.note ?? 'Agradecemos vestir con elegancia para acompañarnos durante toda la celebración.';

  return [
    { q: '¿Cuál será el código de vestimenta?', a: `${dressCode}. ${dressNote}` },
    { q: '¿Puedo llevar acompañante?', a: 'La cantidad de lugares y los acompañantes incluidos aparecen dentro de tu invitación personalizada.' },
    { q: '¿Será una celebración para niños?', a: 'Los lugares disponibles para cada familia aparecen en su invitación. Agradecemos respetar la cantidad indicada.' },
    { q: '¿Cuándo debo confirmar?', a: 'La fecha límite se compartirá con la invitación final. Podrás actualizar tu respuesta comunicándote con la pareja.' },
  ];
}
